import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();
const googleClient = new OAuth2Client(env.google.clientId);

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
});

function publicUser(u: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}) {
  return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl };
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name } = credentialsSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? email.split('@')[0] },
    });
    const token = signToken({ sub: user.id, email: user.email });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema
      .omit({ name: true })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new HttpError(401, 'Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const token = signToken({ sub: user.id, email: user.email });
    res.json({ token, user: publicUser(user) });
  })
);

// POST /api/auth/google   { idToken }
// The mobile app performs Google Sign-In and sends the ID token here.
router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { idToken } = z.object({ idToken: z.string() }).parse(req.body);
    if (!env.google.clientId) {
      throw new HttpError(500, 'Google Sign-In not configured on server');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new HttpError(401, 'Invalid Google token');

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        googleId: payload.sub,
        name: payload.name,
        avatarUrl: payload.picture,
      },
      create: {
        email: payload.email,
        googleId: payload.sub,
        name: payload.name ?? payload.email.split('@')[0],
        avatarUrl: payload.picture,
      },
    });
    const token = signToken({ sub: user.id, email: user.email });
    res.json({ token, user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        gmailAccount: {
          select: { email: true, lastSyncedAt: true, accessToken: true },
        },
      },
    });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({
      user: publicUser(user),
      gmailConnected: Boolean(
        user.gmailAccount?.accessToken || user.gmailAccount?.email
      ),
      gmailAccount: user.gmailAccount
        ? {
            email: user.gmailAccount.email,
            lastSyncedAt: user.gmailAccount.lastSyncedAt,
          }
        : null,
    });
  })
);

export default router;
