// ===========================================================================
// MoneySense finance engine — pure, deterministic calculations.
//
// Everything here is transparent and testable. The AI layer consumes the
// structured output of these functions rather than doing math itself, so
// numbers stay consistent between the UI and the AI Copilot.
// ===========================================================================

import type {
  Budget,
  Category,
  Expense,
  FinanceContext,
  FinancialProfile,
  Goal,
  Investment,
  Subscription,
} from "./types";

// -------------------------- date helpers -----------------------------------

export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): string {
  return monthKey(now);
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return monthKey(date);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function inMonth(e: Expense, key: string): boolean {
  return monthKey(e.transaction_date) === key;
}

function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// -------------------------- monthly summary --------------------------------

export interface MonthSummary {
  monthKey: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number; // percentage
  availableBalance: number;
  fixedCommitments: number;
  discretionarySpend: number;
  transactionCount: number;
}

export function fixedCommitments(fin: FinancialProfile | null): number {
  if (!fin) return 0;
  return (
    (fin.rent || 0) +
    (fin.emi || 0) +
    (fin.utilities || 0) +
    (fin.insurance || 0) +
    (fin.other_fixed || 0)
  );
}

export function monthSummary(
  ctx: FinanceContext,
  key = currentMonthKey()
): MonthSummary {
  const income = ctx.financial?.monthly_income || ctx.profile?.monthly_income || 0;
  const monthExpenses = ctx.expenses.filter((e) => inMonth(e, key));
  const expenses = sum(monthExpenses.map((e) => e.amount));
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const currentCash = ctx.financial?.current_cash || 0;
  // Available balance = cash on hand minus what is still likely to leave the
  // account this month (a simple, transparent proxy).
  const availableBalance = currentCash;

  return {
    monthKey: key,
    income,
    expenses,
    savings,
    savingsRate,
    availableBalance,
    fixedCommitments: fixedCommitments(ctx.financial),
    discretionarySpend: sum(
      monthExpenses
        .filter((e) => DISCRETIONARY.includes(e.category))
        .map((e) => e.amount)
    ),
    transactionCount: monthExpenses.length,
  };
}

export const DISCRETIONARY: Category[] = [
  "Food",
  "Shopping",
  "Entertainment",
  "Travel",
];

// -------------------------- category breakdown -----------------------------

export interface CategorySlice {
  category: Category;
  amount: number;
  percent: number;
  prevAmount: number;
  changePercent: number; // vs previous month
}

export function categoryBreakdown(
  ctx: FinanceContext,
  key = currentMonthKey()
): CategorySlice[] {
  const prevKey = addMonths(key, -1);
  const current = groupByCategory(ctx.expenses.filter((e) => inMonth(e, key)));
  const prev = groupByCategory(ctx.expenses.filter((e) => inMonth(e, prevKey)));
  const total = sum(Object.values(current));

  const cats = new Set<string>([...Object.keys(current), ...Object.keys(prev)]);
  const slices: CategorySlice[] = [];
  cats.forEach((c) => {
    const amount = current[c] || 0;
    const prevAmount = prev[c] || 0;
    if (amount === 0 && prevAmount === 0) return;
    slices.push({
      category: c as Category,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
      prevAmount,
      changePercent:
        prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : amount > 0 ? 100 : 0,
    });
  });
  return slices.sort((a, b) => b.amount - a.amount);
}

function groupByCategory(expenses: Expense[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) out[e.category] = (out[e.category] || 0) + e.amount;
  return out;
}

// -------------------------- monthly trend ----------------------------------

export interface TrendPoint {
  monthKey: string;
  label: string;
  expenses: number;
  savings: number;
  income: number;
}

export function monthlyTrend(
  ctx: FinanceContext,
  months = 5,
  end = currentMonthKey()
): TrendPoint[] {
  const income = ctx.financial?.monthly_income || ctx.profile?.monthly_income || 0;
  const points: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = addMonths(end, -i);
    const expenses = sum(
      ctx.expenses.filter((e) => inMonth(e, key)).map((e) => e.amount)
    );
    points.push({
      monthKey: key,
      label: monthLabel(key),
      expenses,
      income,
      savings: income - expenses,
    });
  }
  return points;
}

// -------------------------- budgets ----------------------------------------

export interface BudgetStatus {
  category: Category;
  budget: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  level: "ok" | "approaching" | "high" | "over";
  message: string;
}

export function budgetStatuses(
  ctx: FinanceContext,
  key = currentMonthKey()
): BudgetStatus[] {
  const monthBudgets = ctx.budgets.filter((b) => b.month === key);
  const spendByCat = groupByCategory(ctx.expenses.filter((e) => inMonth(e, key)));
  return monthBudgets
    .map((b) => {
      const actual = spendByCat[b.category] || 0;
      const percentUsed = b.amount > 0 ? (actual / b.amount) * 100 : 0;
      const remaining = b.amount - actual;
      let level: BudgetStatus["level"] = "ok";
      let message = "On track.";
      if (percentUsed >= 100) {
        level = "over";
        message = `Exceeded by ${Math.round(actual - b.amount)}.`;
      } else if (percentUsed >= 90) {
        level = "high";
        message = "You've used 90% of your budget.";
      } else if (percentUsed >= 75) {
        level = "approaching";
        message = "You're approaching your budget.";
      }
      return {
        category: b.category,
        budget: b.amount,
        actual,
        remaining,
        percentUsed,
        level,
        message,
      };
    })
    .sort((a, b) => b.percentUsed - a.percentUsed);
}

// -------------------------- goals ------------------------------------------

export interface GoalStatus {
  goal: Goal;
  remaining: number;
  progressPercent: number;
  monthsRemaining: number | null;
  requiredMonthly: number | null;
  status: "on_track" | "slightly_behind" | "significantly_behind" | "achieved";
}

export function goalStatus(goal: Goal, monthlySurplus = 0): GoalStatus {
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
  const progressPercent =
    goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

  let monthsRemaining: number | null = null;
  if (goal.target_date) {
    const now = new Date();
    const target = new Date(goal.target_date);
    monthsRemaining = Math.max(
      0,
      (target.getFullYear() - now.getFullYear()) * 12 +
        (target.getMonth() - now.getMonth())
    );
  } else if (goal.horizon_months) {
    monthsRemaining = goal.horizon_months;
  }

  const requiredMonthly =
    monthsRemaining && monthsRemaining > 0 ? remaining / monthsRemaining : null;

  let status: GoalStatus["status"] = "on_track";
  if (progressPercent >= 100) {
    status = "achieved";
  } else if (requiredMonthly != null) {
    // Compare the required pace against a fair share of the user's surplus.
    if (requiredMonthly > monthlySurplus * 1.5) status = "significantly_behind";
    else if (requiredMonthly > monthlySurplus) status = "slightly_behind";
  }

  return { goal, remaining, progressPercent, monthsRemaining, requiredMonthly, status };
}

// -------------------- investable surplus + readiness -----------------------

export interface SurplusBreakdown {
  currentCash: number;
  emergencyReserveRequired: number;
  emergencyReserveHeld: number;
  emergencyGap: number;
  upcomingExpenses: number;
  goalAllocationNeeded: number;
  investableSurplus: number;
  essentialMonthlyExpenses: number;
  reserveRangeLow: number;
  reserveRangeHigh: number;
  reserveStatus: "under" | "within" | "above";
}

// Emergency reserve guideline is configurable (default 3–6 months essentials).
export function surplusBreakdown(
  ctx: FinanceContext,
  opts: { reserveMonths?: number; horizonMonths?: number } = {}
): SurplusBreakdown {
  const reserveMonths = opts.reserveMonths ?? 6;
  const horizonMonths = opts.horizonMonths ?? 12;

  const essentialMonthlyExpenses = essentialMonthly(ctx);
  const emergencyReserveRequired = essentialMonthlyExpenses * reserveMonths;
  const emergencyReserveHeld = ctx.financial?.emergency_fund || 0;
  const currentCash = ctx.financial?.current_cash || 0;

  // Upcoming known recurring / subscription outflows in the horizon.
  const upcomingExpenses = sum(
    ctx.subscriptions
      .filter((s) => s.active)
      .map((s) => annualizedSubscription(s) / 12)
  );

  // Goals needing funding within the horizon.
  const goalAllocationNeeded = sum(
    ctx.goals.map((g) => {
      const st = goalStatus(g);
      if (st.monthsRemaining != null && st.monthsRemaining <= horizonMonths) {
        return st.remaining;
      }
      return st.requiredMonthly ? st.requiredMonthly * horizonMonths : 0;
    })
  );

  const emergencyGap = Math.max(emergencyReserveRequired - emergencyReserveHeld, 0);

  const investableSurplus = Math.max(
    currentCash - emergencyGap - upcomingExpenses - goalAllocationNeeded,
    0
  );

  const reserveRangeLow = essentialMonthlyExpenses * 3;
  const reserveRangeHigh = essentialMonthlyExpenses * 6;
  let reserveStatus: SurplusBreakdown["reserveStatus"] = "within";
  if (emergencyReserveHeld < reserveRangeLow) reserveStatus = "under";
  else if (emergencyReserveHeld > reserveRangeHigh) reserveStatus = "above";

  return {
    currentCash,
    emergencyReserveRequired,
    emergencyReserveHeld,
    emergencyGap,
    upcomingExpenses,
    goalAllocationNeeded,
    investableSurplus,
    essentialMonthlyExpenses,
    reserveRangeLow,
    reserveRangeHigh,
    reserveStatus,
  };
}

export function essentialMonthly(ctx: FinanceContext): number {
  const fixed = fixedCommitments(ctx.financial);
  // Add a conservative essentials estimate from recent food + transport spend.
  const key = currentMonthKey();
  const byCat = groupByCategory(ctx.expenses.filter((e) => inMonth(e, key)));
  const essentials = (byCat["Food"] || 0) + (byCat["Transport"] || 0) + (byCat["Health"] || 0);
  const fallbackFood = ctx.financial?.food_budget || 0;
  const fallbackTransport = ctx.financial?.transport_budget || 0;
  return fixed + Math.max(essentials, fallbackFood + fallbackTransport);
}

// ------------------- monthly investable surplus (income based) -------------

export function monthlySurplus(ctx: FinanceContext, key = currentMonthKey()): number {
  const s = monthSummary(ctx, key);
  const savingsTarget = ctx.financial?.savings_target || 0;
  return Math.max(s.savings - savingsTarget, 0);
}

// -------------------------- affordability engine ---------------------------

export interface AffordabilityResult {
  amount: number;
  productName?: string;
  verdict: "comfortable" | "caution" | "not_recommended";
  reasons: string[];
  before: ConsequenceSnapshot;
  after: ConsequenceSnapshot;
  goalDelayMonths: number | null;
  remainingDiscretionary: number;
}

export interface ConsequenceSnapshot {
  monthlySavings: number;
  savingsRate: number;
  availableBalance: number;
  cashReserveHealth: "healthy" | "lower" | "low";
  goalProgress: "on_track" | "delayed";
}

export function affordability(
  ctx: FinanceContext,
  amount: number,
  productName?: string
): AffordabilityResult {
  const s = monthSummary(ctx);
  const surplus = surplusBreakdown(ctx);
  const savingsTarget = ctx.financial?.savings_target || 0;

  const beforeSavings = s.savings;
  const afterSavings = s.savings - amount;
  const beforeRate = s.savingsRate;
  const afterRate = s.income > 0 ? (afterSavings / s.income) * 100 : 0;
  const beforeBalance = s.availableBalance;
  const afterBalance = s.availableBalance - amount;

  const reasons: string[] = [];
  let verdict: AffordabilityResult["verdict"] = "comfortable";

  // Rule 1: does the purchase eat into the emergency reserve?
  if (afterBalance < surplus.emergencyReserveHeld) {
    verdict = "not_recommended";
    reasons.push(
      "This purchase would draw your cash below your emergency reserve."
    );
  }
  // Rule 2: does it push savings below target?
  if (afterSavings < savingsTarget && verdict !== "not_recommended") {
    verdict = "caution";
    reasons.push(
      `This would take your monthly savings below your target of ${Math.round(
        savingsTarget
      )}.`
    );
  }
  // Rule 3: does it exceed investable surplus meaningfully?
  if (amount > surplus.investableSurplus && verdict === "comfortable") {
    verdict = "caution";
    reasons.push(
      "The amount is larger than your currently estimated free surplus."
    );
  }
  // Rule 4: negative savings this month.
  if (afterSavings < 0) {
    verdict = "not_recommended";
    reasons.push("You would spend more than you earn this month.");
  }

  if (verdict === "comfortable") {
    reasons.push("This purchase fits comfortably within your plan.");
  }

  // Goal delay estimate: how many extra months of surplus does it cost the
  // nearest active goal?
  const surplusPerMonth = monthlySurplus(ctx) || 1;
  const goalDelayMonths =
    ctx.goals.length > 0 ? Math.max(0, Math.round(amount / surplusPerMonth)) : null;

  const remainingDiscretionary = Math.max(
    (ctx.financial?.food_budget || 0) +
      (ctx.financial?.transport_budget || 0) -
      s.discretionarySpend -
      amount,
    0
  );

  const cashHealth = (bal: number): ConsequenceSnapshot["cashReserveHealth"] => {
    if (bal >= surplus.emergencyReserveRequired) return "healthy";
    if (bal >= surplus.emergencyReserveRequired * 0.6) return "lower";
    return "low";
  };

  return {
    amount,
    productName,
    verdict,
    reasons,
    goalDelayMonths,
    remainingDiscretionary,
    before: {
      monthlySavings: beforeSavings,
      savingsRate: beforeRate,
      availableBalance: beforeBalance,
      cashReserveHealth: cashHealth(beforeBalance),
      goalProgress: "on_track",
    },
    after: {
      monthlySavings: afterSavings,
      savingsRate: afterRate,
      availableBalance: afterBalance,
      cashReserveHealth: cashHealth(afterBalance),
      goalProgress: goalDelayMonths && goalDelayMonths > 0 ? "delayed" : "on_track",
    },
  };
}

// -------------------------- cash flow prediction ---------------------------

export interface CashFlowPrediction {
  currentBalance: number;
  spentSoFar: number;
  projectedRemainingSpend: number;
  predictedMonthEndBalance: number;
  dailyBurnRate: number;
  lowBalanceDate: string | null;
  lowBalanceThreshold: number;
}

// Transparent linear projection based on daily burn rate so far this month.
export function cashFlowPrediction(
  ctx: FinanceContext,
  now = new Date(),
  lowBalanceThreshold = 10000
): CashFlowPrediction {
  const key = currentMonthKey(now);
  const dim = daysInMonth(key);
  const dayOfMonth = now.getDate();
  const spentSoFar = sum(
    ctx.expenses.filter((e) => inMonth(e, key)).map((e) => e.amount)
  );
  const dailyBurnRate = dayOfMonth > 0 ? spentSoFar / dayOfMonth : 0;
  const daysLeft = dim - dayOfMonth;
  const projectedRemainingSpend = dailyBurnRate * daysLeft;
  const currentBalance = ctx.financial?.current_cash || 0;
  const predictedMonthEndBalance = currentBalance - projectedRemainingSpend;

  let lowBalanceDate: string | null = null;
  if (dailyBurnRate > 0 && currentBalance > lowBalanceThreshold) {
    const daysToThreshold = Math.floor(
      (currentBalance - lowBalanceThreshold) / dailyBurnRate
    );
    const d = new Date(now);
    d.setDate(d.getDate() + daysToThreshold);
    if (daysToThreshold <= daysLeft) {
      lowBalanceDate = d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
    }
  }

  return {
    currentBalance,
    spentSoFar,
    projectedRemainingSpend,
    predictedMonthEndBalance,
    dailyBurnRate,
    lowBalanceDate,
    lowBalanceThreshold,
  };
}

// -------------------------- financial health score -------------------------

export interface HealthScore {
  score: number; // 0-100
  positives: string[];
  negatives: string[];
  components: { label: string; score: number; max: number }[];
}

export function financialHealthScore(ctx: FinanceContext): HealthScore {
  const s = monthSummary(ctx);
  const surplus = surplusBreakdown(ctx);
  const positives: string[] = [];
  const negatives: string[] = [];
  const components: HealthScore["components"] = [];

  // Savings rate (max 30)
  const srScore = clamp((s.savingsRate / 30) * 30, 0, 30);
  components.push({ label: "Savings rate", score: Math.round(srScore), max: 30 });
  if (s.savingsRate >= 20) positives.push("Strong savings rate");
  else negatives.push("Savings rate could be higher");

  // Emergency fund coverage (max 25)
  const coverage =
    surplus.essentialMonthlyExpenses > 0
      ? surplus.emergencyReserveHeld / surplus.essentialMonthlyExpenses
      : 0;
  const efScore = clamp((coverage / 6) * 25, 0, 25);
  components.push({
    label: "Emergency fund",
    score: Math.round(efScore),
    max: 25,
  });
  if (coverage >= 3) positives.push("Emergency fund on track");
  else negatives.push("Emergency fund below 3 months of essentials");

  // Budget adherence (max 20)
  const budgets = budgetStatuses(ctx);
  const overBudget = budgets.filter((b) => b.level === "over").length;
  const baScore =
    budgets.length === 0 ? 12 : clamp(20 - overBudget * 6, 0, 20);
  components.push({
    label: "Budget discipline",
    score: Math.round(baScore),
    max: 20,
  });
  if (overBudget === 0 && budgets.length > 0) positives.push("Good budget discipline");
  else if (overBudget > 0) negatives.push(`${overBudget} budget(s) exceeded`);

  // Goal progress (max 15)
  const goalScores = ctx.goals.map((g) => goalStatus(g).progressPercent);
  const avgGoal = goalScores.length ? avg(goalScores) : 50;
  const gpScore = clamp((avgGoal / 100) * 15, 0, 15);
  components.push({ label: "Goal progress", score: Math.round(gpScore), max: 15 });
  if (avgGoal >= 50) positives.push("Goals are progressing well");

  // Recurring expense burden (max 10)
  const recurringMonthly = sum(
    ctx.subscriptions.filter((x) => x.active).map((x) => annualizedSubscription(x) / 12)
  );
  const burden = s.income > 0 ? recurringMonthly / s.income : 0;
  const reScore = clamp(10 - burden * 40, 0, 10);
  components.push({
    label: "Recurring burden",
    score: Math.round(reScore),
    max: 10,
  });
  if (burden > 0.15) negatives.push("Subscription / recurring costs are high");

  // Debt penalty
  const debt = ctx.financial?.high_cost_debt || 0;
  if (debt > 0) negatives.push("High-cost debt reduces flexibility");

  const raw =
    srScore + efScore + baScore + gpScore + reScore - (debt > 0 ? 8 : 0);
  const score = Math.round(clamp(raw, 0, 100));

  return { score, positives, negatives, components };
}

// -------------------------- leak detection ---------------------------------

export interface Leak {
  title: string;
  amount: number;
  detail: string;
  calculation: string;
  potentialSaving: number;
}

export function detectLeaks(ctx: FinanceContext, key = currentMonthKey()): Leak[] {
  const leaks: Leak[] = [];
  const monthExpenses = ctx.expenses.filter((e) => inMonth(e, key));

  // Frequent small convenience purchases (< 300 in Food/Shopping).
  const smallConvenience = monthExpenses.filter(
    (e) => e.amount <= 300 && (e.category === "Food" || e.category === "Shopping")
  );
  if (smallConvenience.length >= 5) {
    const total = sum(smallConvenience.map((e) => e.amount));
    const saving = total * 0.3;
    leaks.push({
      title: "Frequent small convenience purchases",
      amount: total,
      detail: `${smallConvenience.length} small purchases (≤ ₹300) this month.`,
      calculation: `${smallConvenience.length} purchases totalling ₹${Math.round(
        total
      )} → reducing by 30% ≈ ₹${Math.round(saving)}/month`,
      potentialSaving: saving,
    });
  }

  // Food delivery frequency.
  const delivery = monthExpenses.filter(
    (e) =>
      e.category === "Food" &&
      /zomato|swiggy|blinkit|zepto/i.test(e.merchant || "")
  );
  if (delivery.length >= 6) {
    const total = sum(delivery.map((e) => e.amount));
    const saving = total * 0.25;
    leaks.push({
      title: "High food-delivery frequency",
      amount: total,
      detail: `${delivery.length} delivery orders this month.`,
      calculation: `${delivery.length} orders totalling ₹${Math.round(
        total
      )} → cutting 25% ≈ ₹${Math.round(saving)}/month`,
      potentialSaving: saving,
    });
  }

  // Fast-growing discretionary categories (>25% up vs last month).
  categoryBreakdown(ctx, key)
    .filter((c) => DISCRETIONARY.includes(c.category) && c.changePercent > 25 && c.amount > 1000)
    .forEach((c) => {
      leaks.push({
        title: `${c.category} spending is growing fast`,
        amount: c.amount,
        detail: `Up ${Math.round(c.changePercent)}% versus last month.`,
        calculation: `₹${Math.round(c.prevAmount)} → ₹${Math.round(
          c.amount
        )} (+${Math.round(c.changePercent)}%)`,
        potentialSaving: (c.amount - c.prevAmount) * 0.5,
      });
    });

  // Potentially unused subscriptions.
  ctx.subscriptions
    .filter((s) => s.active && (s.last_used_days ?? 0) >= 45)
    .forEach((s) => {
      const monthly = annualizedSubscription(s) / 12;
      leaks.push({
        title: `Possibly unused: ${s.name}`,
        amount: monthly,
        detail: `No recorded use in ${s.last_used_days} days.`,
        calculation: `₹${Math.round(monthly)}/month → ₹${Math.round(
          monthly * 12
        )}/year if cancelled`,
        potentialSaving: monthly,
      });
    });

  return leaks.sort((a, b) => b.potentialSaving - a.potentialSaving);
}

// -------------------------- behavioral analytics ---------------------------

export interface Behavior {
  averageTransactionSize: number;
  weekendSpend: number;
  weekdaySpend: number;
  peakHourLabel: string | null;
  smallTransactionCount: number;
  topMerchants: { merchant: string; amount: number; count: number }[];
  insights: string[];
}

export function behavioralAnalytics(
  ctx: FinanceContext,
  key = currentMonthKey()
): Behavior {
  const monthExpenses = ctx.expenses.filter((e) => inMonth(e, key));
  const amounts = monthExpenses.map((e) => e.amount);
  const averageTransactionSize = amounts.length ? avg(amounts) : 0;

  let weekendSpend = 0;
  let weekdaySpend = 0;
  const hourBuckets: Record<number, number> = {};
  for (const e of monthExpenses) {
    const d = new Date(e.transaction_date);
    const day = d.getDay();
    if (day === 0 || day === 6) weekendSpend += e.amount;
    else weekdaySpend += e.amount;
    const hour = new Date(e.created_at).getHours();
    hourBuckets[hour] = (hourBuckets[hour] || 0) + e.amount;
  }

  const smallTransactionCount = monthExpenses.filter((e) => e.amount <= 200).length;

  const merchantMap: Record<string, { amount: number; count: number }> = {};
  for (const e of monthExpenses) {
    const m = e.merchant || "Unknown";
    if (!merchantMap[m]) merchantMap[m] = { amount: 0, count: 0 };
    merchantMap[m].amount += e.amount;
    merchantMap[m].count += 1;
  }
  const topMerchants = Object.entries(merchantMap)
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  let peakHour: number | null = null;
  let peakVal = 0;
  Object.entries(hourBuckets).forEach(([h, v]) => {
    if (v > peakVal) {
      peakVal = v;
      peakHour = Number(h);
    }
  });
  const peakHourLabel =
    peakHour != null ? `${formatHour(peakHour)}–${formatHour((peakHour + 3) % 24)}` : null;

  const insights: string[] = [];
  if (weekendSpend > weekdaySpend * 0.6 && weekendSpend > 0) {
    insights.push("Your weekend spending is notably higher than weekdays.");
  }
  if (peakHourLabel) {
    insights.push(`Your spending peaks around ${peakHourLabel}.`);
  }
  if (smallTransactionCount >= 8) {
    insights.push(
      `You made ${smallTransactionCount} small transactions (≤ ₹200) this month.`
    );
  }

  return {
    averageTransactionSize,
    weekendSpend,
    weekdaySpend,
    peakHourLabel,
    smallTransactionCount,
    topMerchants,
    insights,
  };
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
}

// -------------------------- subscriptions ----------------------------------

export function annualizedSubscription(s: Subscription): number {
  switch (s.frequency) {
    case "weekly":
      return s.amount * 52;
    case "monthly":
      return s.amount * 12;
    case "quarterly":
      return s.amount * 4;
    case "yearly":
      return s.amount;
    default:
      return s.amount * 12;
  }
}

export function subscriptionsAnnualTotal(subs: Subscription[]): number {
  return sum(subs.filter((s) => s.active).map(annualizedSubscription));
}

// -------------------------- investment simulator ---------------------------

export interface SimResult {
  totalContributions: number;
  futureValue: number;
  growth: number;
}

// Future value of an initial lump sum + monthly SIP compounded monthly.
export function simulateInvestment(
  initial: number,
  monthly: number,
  years: number,
  annualReturnPct: number
): SimResult {
  const months = Math.round(years * 12);
  const r = annualReturnPct / 100 / 12;
  let fvInitial = initial;
  let fvMonthly = 0;
  if (r === 0) {
    fvInitial = initial;
    fvMonthly = monthly * months;
  } else {
    fvInitial = initial * Math.pow(1 + r, months);
    fvMonthly = monthly * ((Math.pow(1 + r, months) - 1) / r);
  }
  const futureValue = fvInitial + fvMonthly;
  const totalContributions = initial + monthly * months;
  return {
    totalContributions,
    futureValue,
    growth: futureValue - totalContributions,
  };
}

export function simulateScenarios(
  initial: number,
  monthly: number,
  years: number,
  baseReturnPct: number
) {
  return {
    conservative: simulateInvestment(initial, monthly, years, Math.max(baseReturnPct - 4, 1)),
    base: simulateInvestment(initial, monthly, years, baseReturnPct),
    optimistic: simulateInvestment(initial, monthly, years, baseReturnPct + 4),
  };
}

// -------------------- allocation engine (educational) ----------------------

export interface AllocationBucket {
  label: string;
  amount: number;
  note: string;
}

export function allocateSurplus(
  amount: number,
  risk: "low" | "moderate" | "growth" | "high",
  horizon: "<1" | "1-3" | "3-5" | "5+"
): AllocationBucket[] {
  // Weights are dynamic based on risk + horizon; never hard-coded to one split.
  const weights = riskHorizonWeights(risk, horizon);
  return [
    {
      label: "Emergency / liquid reserve",
      amount: round0(amount * weights.liquid),
      note: "Savings, liquid funds — instant access.",
    },
    {
      label: "Short-term goal bucket",
      amount: round0(amount * weights.shortTerm),
      note: "Fixed deposits, short-duration debt funds.",
    },
    {
      label: "Long-term investment bucket",
      amount: round0(amount * weights.longTerm),
      note: "Diversified equity / index funds (higher risk).",
    },
    {
      label: "Flexible reserve",
      amount: round0(amount * weights.flexible),
      note: "Unallocated buffer for opportunities.",
    },
  ];
}

function riskHorizonWeights(
  risk: "low" | "moderate" | "growth" | "high",
  horizon: "<1" | "1-3" | "3-5" | "5+"
) {
  const riskLong: Record<string, number> = {
    low: 0.15,
    moderate: 0.35,
    growth: 0.55,
    high: 0.7,
  };
  const horizonBoost: Record<string, number> = {
    "<1": -0.25,
    "1-3": -0.1,
    "3-5": 0.05,
    "5+": 0.2,
  };
  let longTerm = clamp(riskLong[risk] + horizonBoost[horizon], 0.05, 0.8);
  const liquid = horizon === "<1" ? 0.45 : horizon === "1-3" ? 0.3 : 0.15;
  const remaining = 1 - longTerm - liquid;
  const shortTerm = clamp(remaining * 0.6, 0.05, 0.5);
  const flexible = clamp(1 - longTerm - liquid - shortTerm, 0.02, 0.3);
  return { liquid, shortTerm, longTerm, flexible };
}

// -------------------------- rule-based insights ----------------------------

export function ruleBasedInsights(ctx: FinanceContext): string[] {
  const out: string[] = [];
  const s = monthSummary(ctx);
  const breakdown = categoryBreakdown(ctx);

  const bigMovers = breakdown
    .filter((c) => Math.abs(c.changePercent) >= 20 && c.amount > 500)
    .slice(0, 2);
  for (const m of bigMovers) {
    out.push(
      `Your ${m.category.toLowerCase()} spending ${
        m.changePercent >= 0 ? "increased" : "decreased"
      } by ${Math.abs(Math.round(m.changePercent))}% compared with last month.`
    );
  }

  if (s.savings > 0) {
    out.push(`You are on track to save ${Math.round(s.savings)} this month.`);
  }

  const surplus = surplusBreakdown(ctx);
  if (surplus.investableSurplus > 1000) {
    out.push(
      `You may have around ${Math.round(
        surplus.investableSurplus
      )} of surplus after your planned commitments.`
    );
  }

  const behavior = behavioralAnalytics(ctx);
  out.push(...behavior.insights);

  return out.slice(0, 5);
}

// -------------------------- utilities --------------------------------------

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
export function avg(nums: number[]): number {
  return nums.length ? sum(nums) / nums.length : 0;
}
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function round0(v: number): number {
  return Math.round(v);
}
