"use client";

import { useState } from "react";
import type { AffordabilityResult } from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, Button, Input, Label, Alert } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import {
  ShoppingCart,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  TrendingUp,
  Wallet,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AffordResponse {
  result: AffordabilityResult;
  investOrSpend: {
    buyImpact: number;
    investedIn5Years: number;
    assumedReturn: number;
    lowerCostOption: number;
    cashPreserved: number;
  };
}

const verdictMeta = {
  comfortable: {
    icon: CheckCircle2,
    label: "🟢 Comfortable",
    tone: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
    desc: "This purchase can be made with limited impact on your financial plans.",
  },
  caution: {
    icon: AlertTriangle,
    label: "🟡 Caution",
    tone: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
    desc: "Possible, but it affects your savings or goals.",
  },
  not_recommended: {
    icon: XCircle,
    label: "🔴 Not Recommended",
    tone: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    desc: "This could materially weaken your financial safety or disrupt important obligations.",
  },
} as const;

export default function AffordPage() {
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AffordResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currency = "INR";

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/afford", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), name }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Could not analyze.");
      else setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Can I Afford This?"
        description="Model a purchase against your full financial plan — before you buy."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={analyze} className="space-y-4">
            <div>
              <Label>What are you planning to buy?</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. New headphones"
              />
            </div>
            <div>
              <Label>Purchase amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="20000"
                className="h-14 text-2xl font-semibold"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Analyze this purchase
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      {data && <Result data={data} currency={currency} />}
    </div>
  );
}

function Result({ data, currency }: { data: AffordResponse; currency: string }) {
  const { result, investOrSpend } = data;
  const meta = verdictMeta[result.verdict];
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <Card className={cn("border", meta.bg)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Icon className={cn("h-8 w-8 shrink-0", meta.tone)} />
            <div>
              <h2 className={cn("text-xl font-bold", meta.tone)}>{meta.label}</h2>
              <p className="mt-1 text-sm text-foreground/80">{meta.desc}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {result.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consequence engine — before vs after */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold">
            What happens if you buy{result.productName ? ` "${result.productName}"` : " this"}?
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <BeforeAfter
              icon={PiggyBank}
              label="Monthly savings"
              before={formatCurrency(result.before.monthlySavings, currency)}
              after={formatCurrency(result.after.monthlySavings, currency)}
              worse={result.after.monthlySavings < result.before.monthlySavings}
            />
            <BeforeAfter
              icon={TrendingUp}
              label="Savings rate"
              before={formatPercent(result.before.savingsRate)}
              after={formatPercent(result.after.savingsRate)}
              worse={result.after.savingsRate < result.before.savingsRate}
            />
            <BeforeAfter
              icon={Wallet}
              label="Available balance"
              before={formatCurrency(result.before.availableBalance, currency)}
              after={formatCurrency(result.after.availableBalance, currency)}
              worse
            />
            <BeforeAfter
              icon={ShoppingCart}
              label="Cash reserve"
              before={cap(result.before.cashReserveHealth)}
              after={cap(result.after.cashReserveHealth)}
              worse={result.after.cashReserveHealth !== result.before.cashReserveHealth}
            />
          </div>

          {result.goalDelayMonths != null && result.goalDelayMonths > 0 && (
            <Alert tone="warning" className="mt-4">
              This purchase could delay a goal by approximately{" "}
              <b>{result.goalDelayMonths} month{result.goalDelayMonths > 1 ? "s" : ""}</b>{" "}
              at your current saving pace.
            </Alert>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Remaining discretionary budget after this:{" "}
            <b className="text-foreground">
              {formatCurrency(result.remainingDiscretionary, currency)}
            </b>
          </p>
        </CardContent>
      </Card>

      {/* Invest or spend */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold">Invest or spend? Consider the trade-offs</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Option
              title="A — Buy now"
              highlight={formatCurrency(investOrSpend.buyImpact, currency)}
              note="Immediate cash impact."
            />
            <Option
              title="B — Invest instead"
              highlight={`~${formatCurrency(investOrSpend.investedIn5Years, currency)}`}
              note={`Illustrative value in 5 years at ${investOrSpend.assumedReturn}% assumed annual return.`}
            />
            <Option
              title="C — Lower-cost option"
              highlight={formatCurrency(investOrSpend.lowerCostOption, currency)}
              note={`Preserves ${formatCurrency(investOrSpend.cashPreserved, currency)} in cash.`}
            />
          </div>
          <Alert tone="info" className="mt-4">
            No option is guaranteed to be better — this is illustrative decision
            support. Investment values can rise or fall.
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function BeforeAfter({
  icon: Icon,
  label,
  before,
  after,
  worse,
}: {
  icon: any;
  label: string;
  before: string;
  after: string;
  worse?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-lg font-semibold text-muted-foreground line-through decoration-1">
          {before}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className={cn("text-lg font-bold", worse ? "text-red-500" : "text-emerald-500")}>
          {after}
        </span>
      </div>
    </div>
  );
}

function Option({
  title,
  highlight,
  note,
}: {
  title: string;
  highlight: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xl font-bold">{highlight}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
