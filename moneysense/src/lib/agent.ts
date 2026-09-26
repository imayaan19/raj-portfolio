// ===========================================================================
// MoneySense agent engine — the Round 2 design, as pure functions.
//
// Two ideas from the submission live here:
//   1. The explained-spend score  — "account for ≥95% of spend, by value".
//   2. The weekly spend envelope   — "never run out before the next top-up".
//
// Everything is deterministic and transparent, exactly like finance.ts: the
// UI and (later) the voice layer read these numbers rather than inventing them.
// ===========================================================================

import type { AgentSettings, Category, Expense, FinanceContext } from "./types";
import { currentMonthKey, monthKey, sum } from "./finance";

// -------------------------- week helpers -----------------------------------

/** Midnight (local) of the most recent `weekday` on or before `now`. */
export function startOfWeek(now: Date, weekday: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = (d.getDay() - weekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** Days until the next payday/sweep weekday (0 = today is payday). */
export function daysUntilPayday(now: Date, weekday: number): number {
  return (weekday - now.getDay() + 7) % 7;
}

const WEEKDAY_LABEL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABEL[((weekday % 7) + 7) % 7];
}

function dateOnly(s: string): Date {
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// -------------------------- explained-spend score --------------------------

export interface ExplainedSpend {
  totalValue: number;
  explainedValue: number;
  percent: number; // 0-100, by value
  target: number; // 95
  meetsTarget: boolean;
  totalCount: number;
  pendingCount: number;
  pending: Expense[]; // unexplained, largest first
  weeklyQuestions: Expense[]; // the (up to) 3 largest — asked once a week
}

export function explainedSpend(
  ctx: FinanceContext,
  key = currentMonthKey(),
  target = 95
): ExplainedSpend {
  const month = ctx.expenses.filter((e) => monthKey(e.transaction_date) === key);
  const totalValue = sum(month.map((e) => e.amount));
  const explainedValue = sum(
    month.filter((e) => e.explained !== false).map((e) => e.amount)
  );
  const percent = totalValue > 0 ? (explainedValue / totalValue) * 100 : 100;

  // Questions are drawn from ALL unexplained transactions (not just this
  // month), largest first, so a late-month debit is never dropped.
  const pending = ctx.expenses
    .filter((e) => e.explained === false)
    .sort((a, b) => b.amount - a.amount);

  return {
    totalValue,
    explainedValue,
    percent,
    target,
    meetsTarget: percent >= target,
    totalCount: month.length,
    pendingCount: pending.length,
    pending,
    weeklyQuestions: pending.slice(0, 3),
  };
}

// -------------------------- weekly envelope --------------------------------

export interface EnvelopeStatus {
  weeklyAmount: number;
  spentThisWeek: number;
  left: number;
  percentUsed: number;
  daysLeftInWeek: number;
  state: "healthy" | "watch" | "overspent" | "unset";
  message: string;
}

export function envelopeStatus(
  ctx: FinanceContext,
  settings: AgentSettings | null,
  now = new Date()
): EnvelopeStatus {
  const weekly = settings?.weekly_amount ?? 0;
  const weekday = settings?.payday_weekday ?? 1;
  const weekStart = startOfWeek(now, weekday);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const spentThisWeek = sum(
    ctx.expenses
      .filter((e) => {
        const d = dateOnly(e.transaction_date);
        return d >= weekStart && d <= today;
      })
      .map((e) => e.amount)
  );

  const left = weekly - spentThisWeek;
  const percentUsed = weekly > 0 ? (spentThisWeek / weekly) * 100 : 0;
  // Days remaining until the next top-up (the payday weekday).
  const daysLeftInWeek = daysUntilPayday(now, weekday) === 0 ? 7 : daysUntilPayday(now, weekday);

  let state: EnvelopeStatus["state"] = "healthy";
  let message = "On track for the week.";
  if (weekly <= 0) {
    state = "unset";
    message = "Set a weekly amount to start the envelope.";
  } else if (left < 0) {
    state = "overspent";
    message = `Over the weekly amount by ${Math.round(-left)}.`;
  } else if (percentUsed >= 80) {
    state = "watch";
    message = `${Math.round(percentUsed)}% used with ${daysLeftInWeek} day(s) to go.`;
  }

  return {
    weeklyAmount: weekly,
    spentThisWeek,
    left,
    percentUsed,
    daysLeftInWeek,
    state,
    message,
  };
}

// -------------------------- Monday digest ----------------------------------

export interface WeeklyDigest {
  spentThisWeek: number;
  left: number;
  biggestCategory: Category | null;
  biggestAmount: number;
  unexplainedCount: number;
  message: string; // the 30-second voice-note text
}

export function weeklyDigest(
  ctx: FinanceContext,
  settings: AgentSettings | null,
  now = new Date()
): WeeklyDigest {
  const env = envelopeStatus(ctx, settings, now);
  const weekday = settings?.payday_weekday ?? 1;
  const weekStart = startOfWeek(now, weekday);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekExpenses = ctx.expenses.filter((e) => {
    const d = dateOnly(e.transaction_date);
    return d >= weekStart && d <= today;
  });

  const byCat: Record<string, number> = {};
  for (const e of weekExpenses) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  let biggestCategory: Category | null = null;
  let biggestAmount = 0;
  for (const [c, v] of Object.entries(byCat)) {
    if (v > biggestAmount) {
      biggestAmount = v;
      biggestCategory = c as Category;
    }
  }

  const unexplainedCount = ctx.expenses.filter((e) => e.explained === false).length;

  const parts: string[] = [];
  parts.push(`Last week you spent ₹${Math.round(env.spentThisWeek)}`);
  if (env.weeklyAmount > 0) {
    parts.push(
      env.left >= 0
        ? `₹${Math.round(env.left)} left in your envelope`
        : `you went ₹${Math.round(-env.left)} over`
    );
  }
  if (biggestCategory) {
    parts.push(`biggest was ${biggestCategory.toLowerCase()}, ₹${Math.round(biggestAmount)}`);
  }
  if (unexplainedCount > 0) {
    parts.push(
      `${unexplainedCount} payment${unexplainedCount > 1 ? "s" : ""} still unexplained — tap to sort`
    );
  }
  const message = parts.join(". ") + ".";

  return {
    spentThisWeek: env.spentThisWeek,
    left: env.left,
    biggestCategory,
    biggestAmount,
    unexplainedCount,
    message,
  };
}

// -------------------------- sweep eligibility ------------------------------

export interface SweepPlan {
  eligible: boolean;
  amount: number;
  reason: string;
}

/** Would this week's automatic sweep run, and why / why not. */
export function planWeeklySweep(
  settings: AgentSettings | null,
  now = new Date()
): SweepPlan {
  if (!settings || settings.weekly_amount <= 0) {
    return { eligible: false, amount: 0, reason: "No weekly amount set yet." };
  }
  if (!settings.auto_sweep) {
    return { eligible: false, amount: settings.weekly_amount, reason: "Sweep is paused (STOP)." };
  }
  if (settings.savings_pool < settings.weekly_amount) {
    return {
      eligible: false,
      amount: settings.weekly_amount,
      reason: "Savings pool is lower than the weekly amount — the agent asks instead of moving.",
    };
  }
  // Already swept in the last 6 days?
  if (settings.last_sweep_at) {
    const days = (now.getTime() - new Date(settings.last_sweep_at).getTime()) / 86_400_000;
    if (days < 6) {
      return {
        eligible: false,
        amount: settings.weekly_amount,
        reason: `Already topped up this week (${Math.floor(days)}d ago).`,
      };
    }
  }
  return {
    eligible: true,
    amount: settings.weekly_amount,
    reason: "Ready — inside every limit you set.",
  };
}
