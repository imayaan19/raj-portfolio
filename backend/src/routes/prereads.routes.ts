import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError } from '../utils/http';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  title: z.string().min(1),
  source: z.string().optional(),
  keyProblems: z.string().optional(),
  coreAnalysis: z.string().optional(),
  actionableTakeaways: z.string().optional(),
});

// GET /api/prereads?q=marketing
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const preReads = await prisma.preRead.findMany({
      where: {
        userId: req.userId,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { source: { contains: q, mode: 'insensitive' } },
                { coreAnalysis: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(preReads);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const preRead = await prisma.preRead.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!preRead) throw new HttpError(404, 'Pre-read not found');
    res.json(preRead);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const preRead = await prisma.preRead.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json(preRead);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.preRead.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Pre-read not found');
    const updated = await prisma.preRead.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.preRead.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Pre-read not found');
    await prisma.preRead.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
