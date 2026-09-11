"use client";

import { useState } from "react";
import {
  completeOnboarding,
  type OnboardingGoal,
} from "@/lib/onboarding-actions";
import { Button, Input, Label, Select, Card, Alert } from "@/components/ui";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Personal",
  "Commitments",
  "Savings",
  "Goals",
  "Risk",
];

const GOAL_TEMPLATES = [
  "Emergency Fund",
  "Travel",
  "Car",
  "Home",
  "Education",
  "Retirement",
  "Laptop/Phone",
  "Investments",
  "Custom goal",
];

const RISK_OPTIONS = [
  { value: "conservative", label: "I want stability" },
  { value: "moderate", label: "I can tolerate small fluctuations" },
  { value: "growth", label: "I can tolerate moderate fluctuations" },
  {
    value: "aggressive",
    label:
      "I can tolerate significant fluctuations for potentially higher long-term growth",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    monthly_income: "",
    currency: "INR",
    employment_type: "Salaried",
    rent: "",
    emi: "",
    utilities: "",
    food_budget: "",
    transport_budget: "",
    insurance: "",
    other_fixed: "",
    current_cash: "",
    emergency_fund: "",
    savings_target: "",
    risk_profile: "moderate",
  });

  const [goals, setGoals] = useState<OnboardingGoal[]>([
    {
      name: "Emergency Fund",
      target_amount: 0,
      current_amount: 0,
      target_date: null,
      category: "Emergency Fund",
    },
  ]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const n = (v: string) => parseFloat(v) || 0;

  function addGoal() {
    setGoals((g) => [
      ...g,
      { name: "", target_amount: 0, current_amount: 0, target_date: null, category: "Custom" },
    ]);
  }
  function updateGoal(i: number, patch: Partial<OnboardingGoal>) {
    setGoals((g) => g.map((goal, idx) => (idx === i ? { ...goal, ...patch } : goal)));
  }
  function removeGoal(i: number) {
    setGoals((g) => g.filter((_, idx) => idx !== i));
  }

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding({
        name: form.name,
        monthly_income: n(form.monthly_income),
        currency: form.currency,
        employment_type: form.employment_type,
        rent: n(form.rent),
        emi: n(form.emi),
        utilities: n(form.utilities),
        food_budget: n(form.food_budget),
        transport_budget: n(form.transport_budget),
        insurance: n(form.insurance),
        other_fixed: n(form.other_fixed),
        current_cash: n(form.current_cash),
        emergency_fund: n(form.emergency_fund),
        savings_target: n(form.savings_target),
        risk_profile: form.risk_profile,
        goals,
      });
      // completeOnboarding redirects on success.
    } catch (e) {
      // A redirect throws NEXT_REDIRECT — let it propagate.
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">MoneySense AI</span>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground ring-4 ring-accent"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    i < step ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {error && (
            <Alert tone="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Step 1 — Personal */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Let&apos;s set you up</h2>
                <p className="text-sm text-muted-foreground">
                  Tell us the basics to personalize your dashboard.
                </p>
              </div>
              <div>
                <Label>Full name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Raj Sharma"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Monthly income</Label>
                  <Input
                    type="number"
                    value={form.monthly_income}
                    onChange={(e) => set("monthly_income", e.target.value)}
                    placeholder="80000"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                  >
                    {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Employment / income type (optional)</Label>
                <Select
                  value={form.employment_type}
                  onChange={(e) => set("employment_type", e.target.value)}
                >
                  {["Salaried", "Self-employed", "Freelancer", "Business", "Student", "Other"].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    )
                  )}
                </Select>
              </div>
            </div>
          )}

          {/* Step 2 — Commitments */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Monthly commitments</h2>
                <p className="text-sm text-muted-foreground">
                  Your recurring fixed and typical expenses.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["rent", "Rent"],
                  ["emi", "EMI"],
                  ["utilities", "Utilities"],
                  ["food_budget", "Food"],
                  ["transport_budget", "Transport"],
                  ["insurance", "Insurance"],
                  ["other_fixed", "Other fixed expenses"],
                ].map(([k, label]) => (
                  <div key={k}>
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      value={(form as any)[k]}
                      onChange={(e) => set(k, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Savings */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Savings &amp; reserves</h2>
                <p className="text-sm text-muted-foreground">
                  Where you stand today.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Current savings / cash</Label>
                  <Input
                    type="number"
                    value={form.current_cash}
                    onChange={(e) => set("current_cash", e.target.value)}
                    placeholder="150000"
                  />
                </div>
                <div>
                  <Label>Current emergency fund</Label>
                  <Input
                    type="number"
                    value={form.emergency_fund}
                    onChange={(e) => set("emergency_fund", e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label>Monthly savings target</Label>
                  <Input
                    type="number"
                    value={form.savings_target}
                    onChange={(e) => set("savings_target", e.target.value)}
                    placeholder="20000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Goals */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Financial goals</h2>
                <p className="text-sm text-muted-foreground">
                  What are you working toward? You can edit these later.
                </p>
              </div>
              <div className="space-y-4">
                {goals.map((g, i) => (
                  <div key={i} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Goal {i + 1}</span>
                      {goals.length > 1 && (
                        <button
                          onClick={() => removeGoal(i)}
                          className="text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Goal</Label>
                        <Select
                          value={GOAL_TEMPLATES.includes(g.name) ? g.name : "Custom goal"}
                          onChange={(e) =>
                            updateGoal(i, {
                              name: e.target.value === "Custom goal" ? "" : e.target.value,
                              category: e.target.value,
                            })
                          }
                        >
                          {GOAL_TEMPLATES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={g.name}
                          onChange={(e) => updateGoal(i, { name: e.target.value })}
                          placeholder="e.g. Europe Trip"
                        />
                      </div>
                      <div>
                        <Label>Target amount</Label>
                        <Input
                          type="number"
                          value={g.target_amount || ""}
                          onChange={(e) =>
                            updateGoal(i, { target_amount: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <Label>Current amount</Label>
                        <Input
                          type="number"
                          value={g.current_amount || ""}
                          onChange={(e) =>
                            updateGoal(i, { current_amount: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Target date</Label>
                        <Input
                          type="date"
                          value={g.target_date || ""}
                          onChange={(e) =>
                            updateGoal(i, { target_date: e.target.value || null })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addGoal} type="button" className="w-full">
                  <Plus className="h-4 w-4" /> Add another goal
                </Button>
              </div>
            </div>
          )}

          {/* Step 5 — Risk */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Risk preference</h2>
                <p className="text-sm text-muted-foreground">
                  How comfortable are you with fluctuations in the value of your
                  investments?
                </p>
              </div>
              <div className="space-y-2">
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("risk_profile", opt.value)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left text-sm transition-colors",
                      form.risk_profile === opt.value
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Alert tone="info">
                Risk tolerance is a preference indicator, not a guarantee of
                investment suitability.
              </Alert>
            </div>
          )}

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0} type="button">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} type="button">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={loading} type="button">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate my dashboard
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
