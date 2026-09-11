"use client";

import { useState } from "react";
import { upsertGoal, deleteGoal } from "@/lib/actions";
import type { Goal } from "@/lib/types";
import { goalStatus, type GoalStatus } from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, Button, Input, Label, Select, Badge, ProgressBar, EmptyState } from "@/components/ui";
import { Plus, Pencil, Trash2, Target, X } from "lucide-react";

const GOAL_CATEGORIES = [
  "Emergency Fund",
  "Travel",
  "Car",
  "Home",
  "Education",
  "Retirement",
  "Laptop/Phone",
  "Investments",
  "Custom",
];

const statusMeta: Record<GoalStatus["status"], { tone: any; label: string }> = {
  on_track: { tone: "success", label: "On track" },
  slightly_behind: { tone: "warning", label: "Slightly behind" },
  significantly_behind: { tone: "danger", label: "Significantly behind" },
  achieved: { tone: "success", label: "Achieved 🎉" },
};

export function GoalsManager({
  goals,
  monthlySurplus,
  currency,
}: {
  goals: Goal[];
  monthlySurplus: number;
  currency: string;
}) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a goal and we'll show the monthly contribution needed to reach it."
          action={<Button onClick={() => setCreating(true)}>Create a goal</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const st = goalStatus(g, monthlySurplus);
            const meta = statusMeta[st.status];
            return (
              <Card key={g.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <button
                        onClick={() => setEditing(g)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <form action={deleteGoal}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className="rounded-lg p-1.5 text-muted-foreground hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ProgressBar value={st.progressPercent} tone="success" />
                    <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(g.current_amount, currency)}</span>
                      <span>{formatPercent(st.progressPercent, 0)}</span>
                      <span>{formatCurrency(g.target_amount, currency)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Remaining" value={formatCurrency(st.remaining, currency)} />
                    <Stat
                      label="Time left"
                      value={
                        st.monthsRemaining != null
                          ? `${st.monthsRemaining} mo`
                          : "—"
                      }
                    />
                    <div className="col-span-2 rounded-xl bg-accent p-3">
                      <p className="text-xs text-accent-foreground/80">
                        Required monthly contribution
                      </p>
                      <p className="text-lg font-semibold text-accent-foreground">
                        {st.requiredMonthly != null
                          ? formatCurrency(st.requiredMonthly, currency)
                          : "Set a target date"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <GoalModal
          goal={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function GoalModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold">{goal ? "Edit goal" : "New goal"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          action={async (fd) => {
            await upsertGoal(fd);
            onClose();
          }}
          className="space-y-3 p-4"
        >
          {goal && <input type="hidden" name="id" value={goal.id} />}
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={goal?.name || ""} required placeholder="Europe Trip" />
          </div>
          <div>
            <Label>Category</Label>
            <Select name="category" defaultValue={goal?.category || "Custom"}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target amount</Label>
              <Input name="target_amount" type="number" defaultValue={goal?.target_amount || ""} required />
            </div>
            <div>
              <Label>Current amount</Label>
              <Input name="current_amount" type="number" defaultValue={goal?.current_amount || 0} />
            </div>
          </div>
          <div>
            <Label>Target date</Label>
            <Input name="target_date" type="date" defaultValue={goal?.target_date || ""} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save goal</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
