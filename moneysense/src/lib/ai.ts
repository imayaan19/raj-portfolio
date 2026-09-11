import OpenAI from "openai";
import type { FinanceContext } from "./types";
import {
  budgetStatuses,
  categoryBreakdown,
  cashFlowPrediction,
  currentMonthKey,
  addMonths,
  financialHealthScore,
  goalStatus,
  monthSummary,
  monthlySurplus,
  ruleBasedInsights,
  subscriptionsAnnualTotal,
  surplusBreakdown,
  sum,
} from "./finance";

export function hasOpenAI(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  // Treat a missing key, or the .env.example placeholder, as "no key" so the
  // app cleanly falls back to rule-based mode instead of calling OpenAI with an
  // obviously-invalid key (which returns a 401).
  return !!key && key.startsWith("sk-") && !key.includes("your-openai-key");
}

function client(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Builds a compact, structured financial snapshot to send to the model.
// Only the current user's own computed numbers are included — never raw PII
// beyond what the user already owns, and never another user's data.
export function buildStructuredContext(ctx: FinanceContext) {
  const key = currentMonthKey();
  const s = monthSummary(ctx, key);
  const prev = monthSummary(ctx, addMonths(key, -1));
  const surplus = surplusBreakdown(ctx);
  const health = financialHealthScore(ctx);
  const cashflow = cashFlowPrediction(ctx);
  const breakdown = categoryBreakdown(ctx, key).map((c) => ({
    category: c.category,
    amount: Math.round(c.amount),
    changePercentVsLastMonth: Math.round(c.changePercent),
  }));
  const budgets = budgetStatuses(ctx, key).map((b) => ({
    category: b.category,
    budget: b.budget,
    spent: Math.round(b.actual),
    percentUsed: Math.round(b.percentUsed),
  }));
  const goals = ctx.goals.map((g) => {
    const st = goalStatus(g, monthlySurplus(ctx));
    return {
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      remaining: Math.round(st.remaining),
      progressPercent: Math.round(st.progressPercent),
      monthsRemaining: st.monthsRemaining,
      requiredMonthly: st.requiredMonthly ? Math.round(st.requiredMonthly) : null,
      status: st.status,
    };
  });

  return {
    currency: ctx.profile?.currency || "INR",
    income: Math.round(s.income),
    expensesThisMonth: Math.round(s.expenses),
    expensesLastMonth: Math.round(prev.expenses),
    savingsThisMonth: Math.round(s.savings),
    savingsRatePercent: Math.round(s.savingsRate * 10) / 10,
    availableBalance: Math.round(s.availableBalance),
    categorySpending: breakdown,
    budgetUsage: budgets,
    goals,
    recurringExpensesAnnual: Math.round(
      subscriptionsAnnualTotal(ctx.subscriptions)
    ),
    subscriptions: ctx.subscriptions
      .filter((x) => x.active)
      .map((x) => ({ name: x.name, amount: x.amount, frequency: x.frequency })),
    currentInvestments: Math.round(
      sum(ctx.investments.map((i) => i.current_value))
    ),
    emergencyFund: surplus.emergencyReserveHeld,
    emergencyReserveRecommended: Math.round(surplus.emergencyReserveRequired),
    investableSurplus: Math.round(surplus.investableSurplus),
    financialHealthScore: health.score,
    predictedMonthEndBalance: Math.round(cashflow.predictedMonthEndBalance),
    riskProfile: ctx.profile?.risk_profile || "moderate",
    highCostDebt: ctx.financial?.high_cost_debt || 0,
  };
}

const SYSTEM_PROMPT = `You are MoneySense AI, a careful personal-finance copilot.
You are given a user's own structured financial snapshot. Use ONLY these numbers.

Rules:
- Be concrete and personal. Reference the user's actual figures.
- Structure every answer with: (1) a direct answer, (2) brief reasoning,
  (3) the relevant numbers, (4) one actionable recommendation, and
  (5) any assumptions you made.
- Never guarantee investment returns or promise profits.
- Never advise investing an entire balance. Always respect emergency reserves.
- Label projections as illustrative and state assumed return/inflation.
- If asked about investments, clearly separate Facts, Assumptions, and
  Illustrative scenarios.
- This is educational decision support, not individualized financial advice.
- Keep answers focused and skimmable (use short paragraphs or bullets).
- The currency is the one given in the snapshot; format amounts with it.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askCopilot(
  ctx: FinanceContext,
  messages: ChatMessage[]
): Promise<string> {
  const snapshot = buildStructuredContext(ctx);

  if (!hasOpenAI()) {
    return fallbackAnswer(ctx, messages[messages.length - 1]?.content || "");
  }

  const completion = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `User's financial snapshot (JSON):\n${JSON.stringify(
          snapshot
        )}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return (
    completion.choices[0]?.message?.content ||
    "I couldn't generate a response right now. Please try again."
  );
}

// Deterministic fallback so the product is fully usable without an API key.
function fallbackAnswer(ctx: FinanceContext, question: string): string {
  const s = monthSummary(ctx);
  const surplus = surplusBreakdown(ctx);
  const insights = ruleBasedInsights(ctx);
  const q = question.toLowerCase();

  let direct = "";
  if (q.includes("save")) {
    direct = `Based on this month, you're on track to save about ${Math.round(
      s.savings
    )} (a ${s.savingsRate.toFixed(1)}% savings rate).`;
  } else if (q.includes("invest") || q.includes("surplus")) {
    direct = `After your emergency reserve and near-term commitments, roughly ${Math.round(
      surplus.investableSurplus
    )} may be available for longer-term allocation.`;
  } else if (q.includes("afford")) {
    direct =
      "Head to 'Can I Afford This?' to model a specific purchase against your plan.";
  } else {
    direct = `Here's a quick read on your finances this month.`;
  }

  return [
    `**Direct answer:** ${direct}`,
    "",
    "**Relevant numbers:**",
    `- Income: ${Math.round(s.income)}`,
    `- Expenses: ${Math.round(s.expenses)}`,
    `- Savings: ${Math.round(s.savings)} (${s.savingsRate.toFixed(1)}%)`,
    `- Estimated investable surplus: ${Math.round(surplus.investableSurplus)}`,
    "",
    insights.length ? "**What stands out:**" : "",
    ...insights.map((i) => `- ${i}`),
    "",
    "_Note: The AI Copilot is running in offline mode (no OpenAI key configured), so this is a rule-based summary. Add OPENAI_API_KEY for full conversational answers. This is educational decision support, not individualized financial advice._",
  ]
    .filter(Boolean)
    .join("\n");
}

// Generates a short AI insight for the dashboard card.
export async function generateInsight(ctx: FinanceContext): Promise<string> {
  const rule = ruleBasedInsights(ctx);
  if (!hasOpenAI()) {
    return rule[0] || "Add a few expenses to unlock personalized insights.";
  }
  try {
    const snapshot = buildStructuredContext(ctx);
    const completion = await client().chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "You write ONE concise, specific, data-driven financial insight (max 2 sentences) from the user's snapshot. No preamble. Reference real numbers.",
        },
        { role: "user", content: JSON.stringify(snapshot) },
      ],
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      rule[0] ||
      "You're building a clear financial picture."
    );
  } catch {
    return rule[0] || "You're building a clear financial picture.";
  }
}
