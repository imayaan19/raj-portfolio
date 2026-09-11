import { getFinanceContext } from "@/lib/data";
import {
  monthSummary,
  addMonths,
  currentMonthKey,
  categoryBreakdown,
  financialHealthScore,
  cashFlowPrediction,
} from "@/lib/finance";
import { generateInsight } from "@/lib/ai";
import { formatCurrency, formatPercent, signedPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  ProgressBar,
} from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Gauge, TrendingUp, CalendarClock, Bot } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";
  const s = monthSummary(ctx);
  const prev = monthSummary(ctx, addMonths(currentMonthKey(), -1));
  const breakdown = categoryBreakdown(ctx).filter((c) => c.prevAmount > 0).slice(0, 6);
  const health = financialHealthScore(ctx);
  const cashflow = cashFlowPrediction(ctx);
  const aiSummary = await generateInsight(ctx);

  const scoreTone =
    health.score >= 75 ? "success" : health.score >= 50 ? "warning" : "danger";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Financial Review"
        description={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      />

      {/* Health score + cash flow */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" /> Financial Health Score
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(health.score / 100) * 264} 264`}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-bold">{health.score}</span>
                  <span className="block text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {health.components.map((c) => (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs">
                      <span>{c.label}</span>
                      <span className="text-muted-foreground">
                        {c.score}/{c.max}
                      </span>
                    </div>
                    <ProgressBar value={(c.score / c.max) * 100} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div>
                {health.positives.map((p) => (
                  <p key={p} className="text-sm text-emerald-600 dark:text-emerald-400">
                    + {p}
                  </p>
                ))}
              </div>
              <div>
                {health.negatives.map((n) => (
                  <p key={n} className="text-sm text-red-500">
                    − {n}
                  </p>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This is an internal budgeting indicator, not a credit score.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" /> Cash-Flow Prediction
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Current available balance" value={formatCurrency(cashflow.currentBalance, currency)} />
            <Row label="Spent so far this month" value={formatCurrency(cashflow.spentSoFar, currency)} />
            <Row
              label="Projected remaining spend"
              value={formatCurrency(cashflow.projectedRemainingSpend, currency)}
            />
            <div className="border-t border-border pt-2">
              <Row
                label="Predicted month-end balance"
                value={formatCurrency(cashflow.predictedMonthEndBalance, currency)}
                strong
              />
            </div>
            {cashflow.lowBalanceDate && (
              <Alert tone="warning">
                At your current spending rate, your balance may fall below{" "}
                {formatCurrency(cashflow.lowBalanceThreshold, currency)} around{" "}
                <b>{cashflow.lowBalanceDate}</b>.
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              This is a transparent estimate based on your daily spending rate so
              far this month — not a guarantee.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* This month summary */}
      <Card>
        <CardHeader>
          <CardTitle>This Month</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Metric label="Income" value={formatCurrency(s.income, currency)} />
          <Metric label="Expenses" value={formatCurrency(s.expenses, currency)} />
          <Metric label="Savings" value={formatCurrency(s.savings, currency)} />
          <Metric label="Savings rate" value={formatPercent(s.savingsRate)} />
        </CardContent>
      </Card>

      {/* What changed */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> What changed?
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough history yet to compare months.
            </p>
          ) : (
            <div className="space-y-2">
              {breakdown.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <span>{c.category}</span>
                  <Badge tone={c.changePercent > 0 ? "danger" : "success"}>
                    {signedPercent(c.changePercent)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI summary */}
      <Card className="border-primary/30 bg-gradient-to-br from-accent to-card">
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Summary</p>
              <p className="mt-1.5 text-sm text-foreground/90">{aiSummary}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-lg font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
