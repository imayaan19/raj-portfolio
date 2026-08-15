import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError } from '../utils/http';

const router = Router();
router.use(requireAuth);

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
});

const workoutSchema = z.object({
  name: z.string().min(1),
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).default([]),
});

// ── Workouts (logged sessions) ──────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workouts = await prisma.workout.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
    });
    res.json(workouts);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = workoutSchema.parse(req.body);
    const workout = await prisma.workout.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json(workout);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Workout not found');
    await prisma.workout.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ── Routines (reusable presets) ─────────────────────────
const routineSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(exerciseSchema).default([]),
});

// Returns the user's routines plus built-in presets.
router.get(
  '/routines',
  asyncHandler(async (req, res) => {
    const routines = await prisma.routine.findMany({
      where: { OR: [{ userId: req.userId }, { isPreset: true }] },
      orderBy: [{ isPreset: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(routines);
  })
);

router.post(
  '/routines',
  asyncHandler(async (req, res) => {
    const data = routineSchema.parse(req.body);
    const routine = await prisma.routine.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json(routine);
  })
);

router.delete(
  '/routines/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.routine.findFirst({
      where: { id: req.params.id, userId: req.userId, isPreset: false },
    });
    if (!existing) throw new HttpError(404, 'Routine not found');
    await prisma.routine.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
