"use client";

import { useMemo, useState } from "react";
import { allocateSurplus } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select, Alert } from "@/components/ui";
import { CHART_COLORS } from "@/components/charts";

const PURPOSES = [
  "Emergency fund",
  "Short-term goal",
  "Medium-term goal",
  "Long-term wealth creation",
  "Retirement",
  "Travel",
  "Home",
  "Car",
  "Education",
  "Other",
];

export function SurplusAllocator({
  currency,
  suggestedSurplus,
  defaultRisk,
}: {
  currency: string;
  suggestedSurplus: number;
  defaultRisk: "low" | "moderate" | "growth" | "high";
}) {
  const [purpose, setPurpose] = useState(PURPOSES[3]);
  const [horizon, setHorizon] = useState<"<1" | "1-3" | "3-5" | "5+">("5+");
  const [risk, setRisk] = useState(defaultRisk);
  const [amount, setAmount] = useState(Math.round(suggestedSurplus) || 50000);
  const [show, setShow] = useState(false);

  const buckets = useMemo(
    () => allocateSurplus(amount, risk, horizon),
    [amount, risk, horizon]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where should I put my surplus?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>What is the money for?</Label>
            <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {PURPOSES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>When will you need it?</Label>
            <Select value={horizon} onChange={(e) => setHorizon(e.target.value as any)}>
              <option value="<1">Less than 1 year</option>
              <option value="1-3">1–3 years</option>
              <option value="3-5">3–5 years</option>
              <option value="5+">5+ years</option>
            </Select>
          </div>
          <div>
            <Label>Risk preference</Label>
            <Select value={risk} onChange={(e) => setRisk(e.target.value as any)}>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="growth">Growth</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div>
            <Label>How much to allocate?</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <Button onClick={() => setShow(true)} className="w-full">
          Suggest an allocation framework
        </Button>

        {show && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              A goal-based framework for {formatCurrency(amount, currency)} —{" "}
              {purpose.toLowerCase()}, {horizon} years, {risk} risk:
            </p>
            {/* Stacked allocation bar */}
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {buckets.map((b, i) => (
                <div
                  key={b.label}
                  style={{
                    width: `${(b.amount / Math.max(amount, 1)) * 100}%`,
                    background: CHART_COLORS[i],
                  }}
                />
              ))}
            </div>
            <div className="space-y-2">
              {buckets.map((b, i) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: CHART_COLORS[i] }}
                    />
                    <div>
                      <p className="text-sm font-medium">{b.label}</p>
                      <p className="text-xs text-muted-foreground">{b.note}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{formatCurrency(b.amount, currency)}</span>
                </div>
              ))}
            </div>
            <Alert tone="info">
              This is an educational decision-support framework, not guaranteed or
              individualized investment advice. Higher potential returns generally
              involve higher risk and volatility.
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
