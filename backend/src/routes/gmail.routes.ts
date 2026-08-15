import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError } from '../utils/http';
import { env } from '../config/env';
import {
  buildConsentUrl,
  saveTokensFromCode,
  searchMessages,
} from '../services/gmail.service';
import { parseMessage } from '../services/parser.service';

const router = Router();

// GET /api/gmail/connect  -> { url }
// The app opens this URL in a browser for the Google consent screen.
router.get(
  '/connect',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.google.clientId || !env.google.clientSecret) {
      throw new HttpError(500, 'Gmail integration not configured on server');
    }
    const url = buildConsentUrl(req.userId!);
    res.json({ url });
  })
);

// GET /api/gmail/callback?code=...&state=<userId>
// Google redirects the browser here after consent.
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    const userId = req.query.state as string | undefined;
    if (!code || !userId) throw new HttpError(400, 'Missing code or state');

    await saveTokensFromCode(userId, code);
    // Bounce the browser to a friendly page / deep link.
    res.redirect(env.google.postConnectRedirect);
  })
);

// A tiny success page for the browser after connecting.
router.get('/connected', (_req, res) => {
  res.send(
    `<html><body style="font-family:system-ui;text-align:center;padding-top:80px">
      <h2>✅ Gmail connected</h2>
      <p>You can close this tab and return to the app.</p>
     </body></html>`
  );
});

// POST /api/gmail/sync
// Fetch matching emails, parse them, and upsert reminders.
router.post(
  '/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    const account = await prisma.gmailAccount.findUnique({
      where: { userId: req.userId },
    });
    if (!account?.accessToken && !account?.refreshToken) {
      throw new HttpError(400, 'Gmail not connected');
    }

    const messages = await searchMessages(req.userId!, env.gmailKeywords);
    const parsed = messages.map(parseMessage);

    let created = 0;
    let updated = 0;
    for (const p of parsed) {
      const result = await prisma.reminder.upsert({
        where: {
          userId_gmailMessageId: {
            userId: req.userId!,
            gmailMessageId: p.gmailMessageId,
          },
        },
        update: {
          title: p.title,
          course: p.course,
          sender: p.sender,
          dueDate: p.dueDate,
        },
        create: {
          userId: req.userId!,
          title: p.title,
          course: p.course,
          sender: p.sender,
          dueDate: p.dueDate,
          source: 'gmail',
          gmailMessageId: p.gmailMessageId,
        },
      });
      // upsert doesn't tell us which path ran; compare timestamps.
      if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
      else updated++;
    }

    await prisma.gmailAccount.update({
      where: { userId: req.userId },
      data: { lastSyncedAt: new Date() },
    });

    res.json({ scanned: messages.length, created, updated });
  })
);

// GET /api/gmail/status
router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const account = await prisma.gmailAccount.findUnique({
      where: { userId: req.userId },
      select: { email: true, lastSyncedAt: true, accessToken: true },
    });
    res.json({
      connected: Boolean(account?.accessToken),
      email: account?.email ?? null,
      lastSyncedAt: account?.lastSyncedAt ?? null,
    });
  })
);

// DELETE /api/gmail/disconnect
router.delete(
  '/disconnect',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.gmailAccount
      .delete({ where: { userId: req.userId } })
      .catch(() => null);
    res.json({ ok: true });
  })
);

export default router;
