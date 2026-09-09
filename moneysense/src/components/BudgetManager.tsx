"use client";

import { useState } from "react";
import { upsertBudget, deleteBudget } from "@/lib/actions";
import { CATEGORIES } from "@/lib/types";
import type { BudgetStatus } from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, Button, Input, Select, Badge, ProgressBar, Alert, EmptyState } from "@/components/ui";
import { Plus, Trash2, PiggyBank } from "lucide-react";

export function BudgetManager({
  statuses,
  month,
  currency,
  budgetIds,
}: {
  statuses: BudgetStatus[];
  month: string;
  currency: string;
  budgetIds: Record<string, string>;
}) {
  const [showForm, setShowForm] = useState(statuses.length === 0);

  const toneFor = (level: BudgetStatus["level"]): "danger" | "warning" | "success" =>
    level === "over"
      ? "danger"
      : level === "high" || level === "approaching"
      ? "warning"
      : "success";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Add / update a budget</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4" /> {showForm ? "Hide" : "New budget"}
            </Button>
          </div>
          {showForm && (
            <form action={upsertBudget} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Select name="category" required>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Input name="amount" type="number" placeholder="Amount" required />
              <input type="hidden" name="month" value={month} />
              <Button type="submit">Save</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {statuses.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set for this month"
          description="Create category budgets to track spending against your plan."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {statuses.map((b) => (
            <Card key={b.category}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{b.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(b.actual, currency)} of{" "}
                      {formatCurrency(b.budget, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={toneFor(b.level)}>{formatPercent(b.percentUsed, 0)}</Badge>
                    {budgetIds[b.category] && (
                      <form action={deleteBudget}>
                        <input type="hidden" name="id" value={budgetIds[b.category]} />
                        <button className="text-muted-foreground hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <ProgressBar
                  value={b.percentUsed}
                  tone={
                    b.level === "over"
                      ? "danger"
                      : b.level === "high" || b.level === "approaching"
                      ? "warning"
                      : "success"
                  }
                  className="mt-3"
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {b.remaining >= 0
                      ? `${formatCurrency(b.remaining, currency)} left`
                      : `${formatCurrency(-b.remaining, currency)} over`}
                  </span>
                  {b.level !== "ok" && (
                    <span
                      className={
                        b.level === "over"
                          ? "text-red-500"
                          : "text-amber-500"
                      }
                    >
                      {b.message}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
