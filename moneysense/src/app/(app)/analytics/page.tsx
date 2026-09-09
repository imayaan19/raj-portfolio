import { getFinanceContext } from "@/lib/data";
import {
  behavioralAnalytics,
  categoryBreakdown,
  detectLeaks,
  monthlyTrend,
  sum,
} from "@/lib/finance";
import { formatCurrency, signedPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  EmptyState,
} from "@/components/ui";
import { DonutChart, BarChart, LineChart } from "@/components/charts";
import { CHART_COLORS } from "@/lib/chart-colors";
import { PageHeader } from "@/components/PageHeader";
import {
  Droplets,
  Clock,
  TrendingUp,
  Store,
  BarChart3,
  Lightbulb,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";

  const breakdown = categoryBreakdown(ctx);
  const trend = monthlyTrend(ctx, 5);
  const behavior = behavioralAnalytics(ctx);
  const leaks = detectLeaks(ctx);

  const donutData = breakdown.map((c) => ({ name: c.category, value: c.amount }));
  const totalLeak = sum(leaks.map((l) => l.potentialSaving));

  if (ctx.expenses.length === 0) {
    return (
      <div>
        <PageHeader title="Analytics" description="Understand your spending patterns." />
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          description="Add some transactions to unlock analytics, behavioral insights and leak detection."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Where your money goes, how it's trending, and where it's leaking."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={donutData} currency={currency} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={trend}
              currency={currency}
              keys={[{ key: "expenses", color: CHART_COLORS[1], label: "Expenses" }]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            data={trend}
            currency={currency}
            keys={[
              { key: "expenses", color: CHART_COLORS[6], label: "Expenses" },
              { key: "savings", color: CHART_COLORS[0], label: "Savings" },
            ]}
          />
        </CardContent>
      </Card>

      {/* Money Leaks */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <span className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-amber-500" /> Money Leaks
              </span>
            </CardTitle>
            {totalLeak > 0 && (
              <Badge tone="warning">
                ~{formatCurrency(totalLeak, currency)}/mo potential
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {leaks.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No significant leaks detected this month. Nicely done.
            </p>
          ) : (
            <div className="space-y-3">
              {leaks.map((leak, i) => (
                <div key={i} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{leak.title}</p>
                      <p className="text-sm text-muted-foreground">{leak.detail}</p>
                    </div>
                    <span className="shrink-0 font-semibold">
                      {formatCurrency(leak.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                    <span className="font-medium">Calculation:</span> {leak.calculation}
                  </div>
                  {leak.potentialSaving > 0 && (
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                      Reducing this could save ~
                      {formatCurrency(leak.potentialSaving, currency)}/month.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top merchants */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" /> Top Merchants
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {behavior.topMerchants.map((m, i) => (
                <div key={m.merchant} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {i + 1}
                    </span>
                    {m.merchant}
                    <span className="text-xs text-muted-foreground">
                      ({m.count}×)
                    </span>
                  </span>
                  <span className="font-semibold">{formatCurrency(m.amount, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category growth */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Category Growth
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdown
                .filter((c) => c.prevAmount > 0 || c.amount > 0)
                .slice(0, 6)
                .map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {formatCurrency(c.prevAmount, currency)} →{" "}
                        {formatCurrency(c.amount, currency)}
                      </span>
                      <Badge tone={c.changePercent > 0 ? "danger" : "success"}>
                        {c.prevAmount > 0 ? signedPercent(c.changePercent) : "new"}
                      </Badge>
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Behavioral analytics */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Behavioral Analytics
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Avg transaction"
              value={formatCurrency(behavior.averageTransactionSize, currency)}
            />
            <Metric
              label="Weekend spend"
              value={formatCurrency(behavior.weekendSpend, currency)}
            />
            <Metric
              label="Weekday spend"
              value={formatCurrency(behavior.weekdaySpend, currency)}
            />
            <Metric
              label="Small transactions"
              value={`${behavior.smallTransactionCount}`}
            />
            <Metric label="Peak spending" value={behavior.peakHourLabel || "—"} />
          </div>
          {behavior.insights.length > 0 && (
            <div className="mt-4 space-y-2">
              {behavior.insights.map((i, idx) => (
                <Alert key={idx} tone="info">
                  <span className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    {i}
                  </span>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
