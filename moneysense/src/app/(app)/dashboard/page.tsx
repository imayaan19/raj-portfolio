import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  PiggyBank,
  Percent,
  Landmark,
  Sparkles,
  Bot,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from "lucide-react";
import { getFinanceContext } from "@/lib/data";
import { generateInsight } from "@/lib/ai";
import {
  categoryBreakdown,
  monthlyTrend,
  monthSummary,
  surplusBreakdown,
  addMonths,
  currentMonthKey,
} from "@/lib/finance";
import { formatCurrency, formatPercent, signedPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, StatCard, Badge, EmptyState, Button } from "@/components/ui";
import { DonutChart, BarChart, CHART_COLORS } from "@/components/charts";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted"
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";
  const name = ctx.profile?.name?.split(" ")[0] || "there";

  const summary = monthSummary(ctx);
  const prev = monthSummary(ctx, addMonths(currentMonthKey(), -1));
  const surplus = surplusBreakdown(ctx);
  const breakdown = categoryBreakdown(ctx).slice(0, 8);
  const trend = monthlyTrend(ctx, 5);
  const insight = await generateInsight(ctx);

  const donutData = breakdown.map((c) => ({ name: c.category, value: c.amount }));
  const recent = ctx.expenses.slice(0, 8);

  const expenseChange =
    prev.expenses > 0
      ? ((summary.expenses - prev.expenses) / prev.expenses) * 100
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${name} 👋`}
        description={`Here's your financial summary for ${new Date().toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" }
        )}.`}
        action={
          <Link href="/add">
            <Button>
              <Receipt className="h-4 w-4" /> Add expense
            </Button>
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Monthly Income"
          value={formatCurrency(summary.income, currency)}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(summary.expenses, currency)}
          icon={TrendingDown}
          tone="danger"
          sub={
            prev.expenses > 0 ? (
              <span
                className={
                  expenseChange > 0 ? "text-red-500" : "text-emerald-500"
                }
              >
                {expenseChange > 0 ? (
                  <ArrowUpRight className="mr-0.5 inline h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-0.5 inline h-3 w-3" />
                )}
                {signedPercent(expenseChange)} vs last month
              </span>
            ) : undefined
          }
        />
        <StatCard
          label="Savings"
          value={formatCurrency(summary.savings, currency)}
          icon={PiggyBank}
          tone="success"
        />
        <StatCard
          label="Savings Rate"
          value={formatPercent(summary.savingsRate)}
          icon={Percent}
          tone="primary"
        />
        <StatCard
          label="Available Balance"
          value={formatCurrency(summary.availableBalance, currency)}
          icon={Landmark}
        />
        <StatCard
          label="Investable Surplus"
          value={formatCurrency(surplus.investableSurplus, currency)}
          icon={Sparkles}
          tone="success"
          sub="After reserves & commitments"
        />
      </div>

      {/* AI Insight */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-accent to-card">
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">🤖 AI Insight</span>
                <Badge tone="success">Personalized</Badge>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                {insight}
              </p>
              <Link
                href="/copilot"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ask the AI Copilot <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/afford" title="Can I afford this?" desc="Model a purchase before you buy." />
        <QuickLink href="/review" title="Monthly review" desc="Health score & cash-flow forecast." />
        <QuickLink href="/investments" title="Make money work" desc="See your investable surplus." />
      </div>

      {/* Spending overview + trend */}
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
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={trend}
              currency={currency}
              keys={[
                { key: "expenses", color: CHART_COLORS[6], label: "Expenses" },
                { key: "savings", color: CHART_COLORS[0], label: "Savings" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Category comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Category breakdown vs last month</CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No spending yet"
              description="Add your first expense to see where your money goes."
              action={
                <Link href="/add">
                  <Button>Add expense</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {breakdown.map((c, i) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="w-28 shrink-0 text-sm font-medium">{c.category}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.percent}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm">
                    {formatCurrency(c.amount, currency)}
                  </span>
                  <span
                    className={`w-16 shrink-0 text-right text-xs ${
                      c.changePercent > 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {c.prevAmount > 0 ? signedPercent(c.changePercent) : "new"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link
              href="/transactions"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your recent activity will appear here."
            />
          ) : (
            <div className="divide-y divide-border">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {(t.merchant || t.category).slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.merchant || t.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category} · {t.payment_method} ·{" "}
                        {new Date(t.transaction_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    -{formatCurrency(t.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        🔒 Your financial information is private to your account.
      </p>
    </div>
  );
}
