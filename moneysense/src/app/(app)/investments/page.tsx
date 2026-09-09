import Link from "next/link";
import { getFinanceContext } from "@/lib/data";
import {
  surplusBreakdown,
  monthlySurplus,
  goalStatus,
  monthSummary,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Badge,
  StatCard,
  ProgressBar,
} from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { InvestmentSimulator } from "@/components/InvestmentSimulator";
import { SurplusAllocator } from "@/components/SurplusAllocator";
import { PortfolioManager } from "@/components/PortfolioManager";
import {
  Wallet,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

const RISK_MAP: Record<string, "low" | "moderate" | "growth" | "high"> = {
  conservative: "low",
  moderate: "moderate",
  growth: "growth",
  aggressive: "high",
};

export default async function InvestmentsPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";
  const surplus = surplusBreakdown(ctx);
  const perMonthSurplus = monthlySurplus(ctx);
  const summary = monthSummary(ctx);
  const debt = ctx.financial?.high_cost_debt || 0;

  const readinessOk = surplus.reserveStatus !== "under";
  const excessCash =
    surplus.currentCash > surplus.emergencyReserveRequired + surplus.upcomingExpenses + 20000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="💰 Make Your Money Work"
        description="Understand how your cash could be allocated after reserves and commitments."
      />

      {/* Investment dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current Balance" value={formatCurrency(surplus.currentCash, currency)} icon={Wallet} />
        <StatCard
          label="Emergency Reserve"
          value={formatCurrency(surplus.emergencyReserveRequired, currency)}
          icon={ShieldCheck}
          sub="Recommended (6 mo essentials)"
        />
        <StatCard
          label="Upcoming + Goals"
          value={formatCurrency(surplus.upcomingExpenses + surplus.goalAllocationNeeded, currency)}
          icon={Target}
        />
        <StatCard
          label="Investable Surplus"
          value={formatCurrency(surplus.investableSurplus, currency)}
          icon={Sparkles}
          tone="success"
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 font-semibold">Available cash → investable surplus</h3>
          <div className="space-y-2 text-sm">
            <Row label="Current available balance" value={formatCurrency(surplus.currentCash, currency)} />
            <Row label="− Emergency reserve gap" value={formatCurrency(surplus.emergencyGap, currency)} sub />
            <Row label="− Upcoming expenses" value={formatCurrency(surplus.upcomingExpenses, currency)} sub />
            <Row label="− Goal allocation needed" value={formatCurrency(surplus.goalAllocationNeeded, currency)} sub />
            <div className="border-t border-border pt-2">
              <Row
                label="Potential investable surplus"
                value={formatCurrency(surplus.investableSurplus, currency)}
                strong
              />
            </div>
          </div>
          <Alert tone="info" className="mt-4">
            Based on the information you&apos;ve provided, approximately{" "}
            <b>{formatCurrency(surplus.investableSurplus, currency)}</b> may be
            available for longer-term allocation after accounting for your reserves
            and upcoming commitments. We never suggest investing your entire
            balance.
          </Alert>
        </CardContent>
      </Card>

      {/* Financial readiness */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Readiness Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row
            label="Essential monthly expenses"
            value={formatCurrency(surplus.essentialMonthlyExpenses, currency)}
          />
          <Row
            label="Illustrative reserve range (3–6 mo)"
            value={`${formatCurrency(surplus.reserveRangeLow, currency)} – ${formatCurrency(
              surplus.reserveRangeHigh,
              currency
            )}`}
          />
          <Row
            label="Current emergency reserve"
            value={formatCurrency(surplus.emergencyReserveHeld, currency)}
          />
          <div className="pt-1">
            {readinessOk ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Within / above target range
              </Badge>
            ) : (
              <Badge tone="warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Below target range
              </Badge>
            )}
          </div>
          {!readinessOk && (
            <Alert tone="warning">
              Consider strengthening your emergency reserve before allocating a
              large portion of your cash toward long-term investments.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid gap-3 lg:grid-cols-2">
        {excessCash && (
          <Alert tone="info" title="Potential excess cash detected">
            Your cash reserve appears higher than your planned emergency and
            short-term requirements. You may want to review whether some of this
            surplus should support longer-term goals.
          </Alert>
        )}
        {surplus.currentCash < surplus.upcomingExpenses && (
          <Alert tone="warning" title="Liquidity check">
            Your liquid balance may be low relative to upcoming commitments.
          </Alert>
        )}
        {debt > 0 && (
          <Alert tone="warning" title="High-cost debt check">
            You&apos;ve recorded {formatCurrency(debt, currency)} of high-cost debt.
            Before increasing investments, consider reviewing these obligations —
            paying them down is often a guaranteed &quot;return.&quot;
          </Alert>
        )}
      </div>

      {/* Surplus allocator */}
      <SurplusAllocator
        currency={currency}
        suggestedSurplus={surplus.investableSurplus}
        defaultRisk={RISK_MAP[ctx.profile?.risk_profile || "moderate"] || "moderate"}
      />

      {/* Investment categories */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Categories (educational)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <CategoryBlock
              title="Lower Risk / Liquidity"
              tone="success"
              items={["Savings", "Fixed deposits", "Liquid / short-duration funds"]}
            />
            <CategoryBlock
              title="Moderate Risk"
              tone="warning"
              items={["Debt-oriented mutual funds", "Hybrid funds"]}
            />
            <CategoryBlock
              title="Higher Risk / Long Term"
              tone="danger"
              items={["Diversified equity funds", "Broad-market index funds", "Retirement / tax-efficient buckets"]}
            />
          </div>
          <Alert tone="info" className="mt-4">
            Higher potential returns generally involve higher risk and volatility.
            These are broad categories, not specific product recommendations.
          </Alert>
        </CardContent>
      </Card>

      {/* Goal-based buckets */}
      {ctx.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goal-Based Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {ctx.goals.map((g) => {
                const st = goalStatus(g, perMonthSurplus);
                return (
                  <div key={g.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{g.name}</p>
                      <Badge
                        tone={
                          st.status === "on_track" || st.status === "achieved"
                            ? "success"
                            : st.status === "slightly_behind"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {st.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <ProgressBar value={st.progressPercent} tone="success" className="mt-3" />
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {st.monthsRemaining != null ? `${st.monthsRemaining} mo left` : "No date"}
                      </span>
                      <span>
                        Needs{" "}
                        {st.requiredMonthly != null
                          ? `${formatCurrency(st.requiredMonthly, currency)}/mo`
                          : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulator */}
      <InvestmentSimulator currency={currency} defaultMonthly={Math.round(perMonthSurplus) || 10000} />

      {/* Portfolio */}
      <PortfolioManager investments={ctx.investments} goals={ctx.goals} currency={currency} />

      {/* AI investment copilot */}
      <Card className="border-primary/30 bg-gradient-to-br from-accent to-card">
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">AI Investment Copilot</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                &quot;I have {formatCurrency(surplus.currentCash, currency)} in my bank
                account. How should I think about allocating it?&quot; — ask the
                Copilot for a personalized, clearly-labeled framework.
              </p>
              <Link
                href="/copilot"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ask the Copilot <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert tone="warning">
        MoneySense AI provides tracking, analysis, education and scenario modeling
        only. It does not execute investments, guarantee returns, or provide
        individualized investment advice.
      </Alert>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  strong,
}: {
  label: string;
  value: string;
  sub?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={sub ? "pl-3 text-muted-foreground" : strong ? "font-semibold" : ""}>
        {label}
      </span>
      <span className={strong ? "text-lg font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}

function CategoryBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <Badge tone={tone}>{title}</Badge>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
