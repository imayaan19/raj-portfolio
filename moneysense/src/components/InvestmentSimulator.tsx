"use client";

import { useMemo, useState } from "react";
import { simulateScenarios } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Alert } from "@/components/ui";
import { LineChart, CHART_COLORS } from "@/components/charts";

export function InvestmentSimulator({
  currency,
  defaultMonthly = 10000,
}: {
  currency: string;
  defaultMonthly?: number;
}) {
  const [initial, setInitial] = useState(50000);
  const [monthly, setMonthly] = useState(defaultMonthly);
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(10);

  const scenarios = useMemo(
    () => simulateScenarios(initial, monthly, years, rate),
    [initial, monthly, years, rate]
  );

  // Build a per-year growth curve for the base scenario.
  const curve = useMemo(() => {
    const points = [];
    for (let y = 0; y <= years; y++) {
      const s = simulateScenarios(initial, monthly, y, rate);
      points.push({
        label: `Y${y}`,
        conservative: Math.round(s.conservative.futureValue),
        base: Math.round(s.base.futureValue),
        optimistic: Math.round(s.optimistic.futureValue),
      });
    }
    return points;
  }, [initial, monthly, years, rate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>What Could My Money Become?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Initial investment" value={initial} onChange={setInitial} />
          <Field label="Monthly contribution" value={monthly} onChange={setMonthly} />
          <div>
            <Label>Period (years)</Label>
            <Input
              type="number"
              value={years}
              min={1}
              max={40}
              onChange={(e) => setYears(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <Label>Assumed return (%)</Label>
            <Input
              type="number"
              value={rate}
              step={0.5}
              onChange={(e) => setRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ScenarioCard
            title="Conservative"
            sub={`${Math.max(rate - 4, 1)}% return`}
            value={formatCurrency(scenarios.conservative.futureValue, currency)}
            growth={formatCurrency(scenarios.conservative.growth, currency)}
          />
          <ScenarioCard
            title="Base"
            sub={`${rate}% return`}
            value={formatCurrency(scenarios.base.futureValue, currency)}
            growth={formatCurrency(scenarios.base.growth, currency)}
            highlight
          />
          <ScenarioCard
            title="Optimistic"
            sub={`${rate + 4}% return`}
            value={formatCurrency(scenarios.optimistic.futureValue, currency)}
            growth={formatCurrency(scenarios.optimistic.growth, currency)}
          />
        </div>

        <div>
          <p className="mb-1 text-sm text-muted-foreground">
            Total contributions:{" "}
            <b className="text-foreground">
              {formatCurrency(scenarios.base.totalContributions, currency)}
            </b>
          </p>
          <LineChart
            data={curve}
            currency={currency}
            keys={[
              { key: "conservative", color: CHART_COLORS[10], label: "Conservative" },
              { key: "base", color: CHART_COLORS[0], label: "Base" },
              { key: "optimistic", color: CHART_COLORS[1], label: "Optimistic" },
            ]}
          />
        </div>

        <Alert tone="warning">
          Illustrative scenario only. Actual investment returns can be higher or
          lower, and investments can lose value.
        </Alert>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function ScenarioCard({
  title,
  sub,
  value,
  growth,
  highlight,
}: {
  title: string;
  sub: string;
  value: string;
  growth: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (highlight ? "border-primary bg-accent" : "border-border")
      }
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400">+{growth} growth</p>
    </div>
  );
}
