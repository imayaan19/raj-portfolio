import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError } from '../utils/http';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1),
  course: z.string().optional(),
  sender: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

// GET /api/reminders?status=pending
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status as 'pending' | 'done' | undefined;
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.userId, ...(status ? { status } : {}) },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(reminders);
  })
);

// POST /api/reminders  (manual entry)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const reminder = await prisma.reminder.create({
      data: { ...data, userId: req.userId!, source: 'manual' },
    });
    res.status(201).json(reminder);
  })
);

// PATCH /api/reminders/:id   (edit fields or toggle status)
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const schema = createSchema.partial().extend({
      status: z.enum(['pending', 'done']).optional(),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Reminder not found');

    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  })
);

// DELETE /api/reminders/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Reminder not found');
    await prisma.reminder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
