import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError } from '../utils/http';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  note: z.string().optional(),
  date: z.coerce.date().optional(),
});

// GET /api/expenses?month=2026-08
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const month = req.query.month as string | undefined; // YYYY-MM
    let where: any = { userId: req.userId };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  })
);

// GET /api/expenses/summary?month=2026-08  -> totals by category
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const rows = await prisma.expense.groupBy({
      by: ['category'],
      where: { userId: req.userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    const byCategory = rows.map((r) => ({
      category: r.category,
      total: r._sum.amount ?? 0,
    }));
    const total = byCategory.reduce((s, r) => s + r.total, 0);
    res.json({ month, total, byCategory });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const expense = await prisma.expense.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json(expense);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Expense not found');
    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, 'Expense not found');
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
