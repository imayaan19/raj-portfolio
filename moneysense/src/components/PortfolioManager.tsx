"use client";

import { useState } from "react";
import { upsertInvestment, deleteInvestment } from "@/lib/actions";
import type { Investment, Goal } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select, Badge, EmptyState } from "@/components/ui";
import { DonutChart } from "@/components/charts";
import { CHART_COLORS } from "@/lib/chart-colors";
import { Plus, Trash2, Pencil, TrendingUp, X } from "lucide-react";

const ASSET_CLASSES = ["Equity", "Debt", "Cash", "Gold", "Other"];

export function PortfolioManager({
  investments,
  goals,
  currency,
}: {
  investments: Investment[];
  goals: Goal[];
  currency: string;
}) {
  const [editing, setEditing] = useState<Investment | null>(null);
  const [creating, setCreating] = useState(false);

  const totalValue = investments.reduce((s, i) => s + i.current_value, 0);
  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const gain = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

  const byClass: Record<string, number> = {};
  investments.forEach((i) => {
    byClass[i.asset_class] = (byClass[i.asset_class] || 0) + i.current_value;
  });
  const allocation = Object.entries(byClass).map(([name, value]) => ({ name, value }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Portfolio
            </span>
          </CardTitle>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add holding
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No holdings yet"
            description="Manually add your investments to track value, allocation and gains."
            action={<Button onClick={() => setCreating(true)}>Add your first holding</Button>}
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Total portfolio" value={formatCurrency(totalValue, currency)} />
              <Metric label="Invested" value={formatCurrency(totalInvested, currency)} />
              <Metric
                label="Gain / loss"
                value={`${gain >= 0 ? "+" : ""}${formatCurrency(gain, currency)} (${formatPercent(gainPct)})`}
                tone={gain >= 0 ? "success" : "danger"}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Allocation</p>
                <DonutChart data={allocation} currency={currency} />
              </div>
              <div className="space-y-2">
                {investments.map((inv) => {
                  const g = inv.current_value - inv.invested_amount;
                  const goal = goals.find((x) => x.id === inv.goal_id);
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-xl border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.asset_name}</p>
                        <p className="text-xs text-muted-foreground">
                          <Badge tone="muted">{inv.asset_class}</Badge>{" "}
                          {goal && <span>· {goal.name}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(inv.current_value, currency)}
                          </p>
                          <p
                            className={`text-xs ${
                              g >= 0 ? "text-emerald-500" : "text-red-500"
                            }`}
                          >
                            {g >= 0 ? "+" : ""}
                            {formatCurrency(g, currency)}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditing(inv)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <form action={deleteInvestment}>
                          <input type="hidden" name="id" value={inv.id} />
                          <button className="p-1 text-muted-foreground hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Past performance does not predict future performance.
            </p>
          </div>
        )}
      </CardContent>

      {(editing || creating) && (
        <InvestmentModal
          investment={editing}
          goals={goals}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "text-lg font-semibold " +
          (tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-500" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

function InvestmentModal({
  investment,
  goals,
  onClose,
}: {
  investment: Investment | null;
  goals: Goal[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold">{investment ? "Edit holding" : "Add holding"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          action={async (fd) => {
            await upsertInvestment(fd);
            onClose();
          }}
          className="space-y-3 p-4"
        >
          {investment && <input type="hidden" name="id" value={investment.id} />}
          <div>
            <Label>Asset name</Label>
            <Input name="asset_name" defaultValue={investment?.asset_name || ""} required placeholder="e.g. Nifty 50 Index Fund" />
          </div>
          <div>
            <Label>Asset class</Label>
            <Select name="asset_class" defaultValue={investment?.asset_class || "Equity"}>
              {ASSET_CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Invested amount</Label>
              <Input name="invested_amount" type="number" defaultValue={investment?.invested_amount || ""} required />
            </div>
            <div>
              <Label>Current value</Label>
              <Input name="current_value" type="number" defaultValue={investment?.current_value || ""} required />
            </div>
          </div>
          <div>
            <Label>Link to goal (optional)</Label>
            <Select name="goal_id" defaultValue={investment?.goal_id || ""}>
              <option value="">None</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
