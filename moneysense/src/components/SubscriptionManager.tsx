"use client";

import { useState } from "react";
import { upsertSubscription, deleteSubscription } from "@/lib/actions";
import type { Subscription } from "@/lib/types";
import { annualizedSubscription } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, Button, Input, Label, Select, Badge, EmptyState } from "@/components/ui";
import { Plus, Trash2, Pencil, RefreshCw, X, AlertTriangle } from "lucide-react";

const FREQ = ["weekly", "monthly", "quarterly", "yearly"];
const CATS = ["Entertainment", "Bills", "Health", "Education", "Insurance", "Other"];

export function SubscriptionManager({
  subscriptions,
  currency,
}: {
  subscriptions: Subscription[];
  currency: string;
}) {
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [creating, setCreating] = useState(false);

  const active = subscriptions.filter((s) => s.active);
  const annualTotal = active.reduce((sum, s) => sum + annualizedSubscription(s), 0);
  const monthlyTotal = annualTotal / 12;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Monthly recurring</p>
          <p className="text-2xl font-semibold">{formatCurrency(monthlyTotal, currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Annualized total</p>
          <p className="text-2xl font-semibold">{formatCurrency(annualTotal, currency)}</p>
        </Card>
        <Card className="flex items-center justify-center p-4">
          <Button onClick={() => setCreating(true)} className="w-full">
            <Plus className="h-4 w-4" /> Add subscription
          </Button>
        </Card>
      </div>

      {active.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Your recurring expenses add up to approximately{" "}
          <b className="text-foreground">{formatCurrency(annualTotal, currency)}</b> per year.
        </p>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No subscriptions tracked"
          description="Add Netflix, Spotify, insurance, gym, EMIs and more to see the annual cost and spot unused services."
          action={<Button onClick={() => setCreating(true)}>Add subscription</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subscriptions.map((s) => {
            const unused = s.active && (s.last_used_days ?? 0) >= 45;
            return (
              <Card key={s.id} className={s.active ? "" : "opacity-60"}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge tone="muted">{s.category}</Badge> · {s.frequency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(s)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <form action={deleteSubscription}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="p-1 text-muted-foreground hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(s.amount, currency)}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}/ {s.frequency.replace("ly", "")}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(annualizedSubscription(s), currency)} / year
                      </p>
                    </div>
                    {s.next_payment_date && (
                      <p className="text-xs text-muted-foreground">
                        Next:{" "}
                        {new Date(s.next_payment_date).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </div>
                  {unused && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Possibly unused — no activity in {s.last_used_days} days.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <SubModal
          sub={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function SubModal({ sub, onClose }: { sub: Subscription | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold">{sub ? "Edit subscription" : "Add subscription"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          action={async (fd) => {
            await upsertSubscription(fd);
            onClose();
          }}
          className="space-y-3 p-4"
        >
          {sub && <input type="hidden" name="id" value={sub.id} />}
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={sub?.name || ""} required placeholder="Netflix" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input name="amount" type="number" defaultValue={sub?.amount || ""} required />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select name="frequency" defaultValue={sub?.frequency || "monthly"}>
                {FREQ.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select name="category" defaultValue={sub?.category || "Entertainment"}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Next payment</Label>
              <Input name="next_payment_date" type="date" defaultValue={sub?.next_payment_date || ""} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={sub ? sub.active : true}
              className="h-4 w-4 accent-emerald-500"
            />
            Active
          </label>
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
