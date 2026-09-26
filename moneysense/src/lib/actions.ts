"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseFloat(String(v ?? ""));
  return isFinite(n) ? n : fallback;
}
function str(v: FormDataEntryValue | null, fallback = ""): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

// ------------------------------ Expenses -----------------------------------
export async function addExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const merchant = str(formData.get("merchant"));
  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount: num(formData.get("amount")),
    merchant,
    category: str(formData.get("category"), "Others"),
    payment_method: str(formData.get("payment_method"), "UPI"),
    transaction_date: str(
      formData.get("transaction_date"),
      new Date().toISOString().slice(0, 10)
    ),
    notes: str(formData.get("notes")) || null,
    recurring: formData.get("recurring") === "on",
    source: str(formData.get("source"), "Manual"),
  });
  if (error) throw new Error(error.message);

  // Learn the merchant → category mapping (best effort, shared table).
  if (merchant) {
    await supabase
      .from("merchant_categories")
      .upsert(
        {
          merchant_name: merchant.toLowerCase(),
          suggested_category: str(formData.get("category"), "Others"),
        },
        { onConflict: "merchant_name" }
      );
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  redirect("/transactions");
}

export async function updateExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData.get("id"));
  const { error } = await supabase
    .from("expenses")
    .update({
      amount: num(formData.get("amount")),
      merchant: str(formData.get("merchant")),
      category: str(formData.get("category"), "Others"),
      payment_method: str(formData.get("payment_method"), "UPI"),
      transaction_date: str(formData.get("transaction_date")),
      notes: str(formData.get("notes")) || null,
      recurring: formData.get("recurring") === "on",
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData.get("id"));
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// ------------------------------ Budgets ------------------------------------
export async function upsertBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category: str(formData.get("category")),
      amount: num(formData.get("amount")),
      month: str(formData.get("month")),
    },
    { onConflict: "user_id,category,month" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function deleteBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("budgets")
    .delete()
    .eq("id", str(formData.get("id")))
    .eq("user_id", user.id);
  revalidatePath("/budgets");
}

// ------------------------------ Goals --------------------------------------
export async function upsertGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData.get("id"));
  const payload = {
    user_id: user.id,
    name: str(formData.get("name")),
    target_amount: num(formData.get("target_amount")),
    current_amount: num(formData.get("current_amount")),
    target_date: str(formData.get("target_date")) || null,
    category: str(formData.get("category"), "Custom"),
    updated_at: new Date().toISOString(),
  };
  const { error } = id
    ? await supabase.from("goals").update(payload).eq("id", id).eq("user_id", user.id)
    : await supabase.from("goals").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("goals")
    .delete()
    .eq("id", str(formData.get("id")))
    .eq("user_id", user.id);
  revalidatePath("/goals");
}

// --------------------------- Subscriptions ---------------------------------
export async function upsertSubscription(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData.get("id"));
  const payload = {
    user_id: user.id,
    name: str(formData.get("name")),
    amount: num(formData.get("amount")),
    frequency: str(formData.get("frequency"), "monthly"),
    next_payment_date: str(formData.get("next_payment_date")) || null,
    category: str(formData.get("category"), "Bills"),
    active: formData.get("active") === "on",
  };
  const { error } = id
    ? await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("subscriptions").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
}

export async function deleteSubscription(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("subscriptions")
    .delete()
    .eq("id", str(formData.get("id")))
    .eq("user_id", user.id);
  revalidatePath("/subscriptions");
}

// ---------------------------- Investments ----------------------------------
export async function upsertInvestment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData.get("id"));
  const payload = {
    user_id: user.id,
    asset_name: str(formData.get("asset_name")),
    asset_class: str(formData.get("asset_class"), "Equity"),
    invested_amount: num(formData.get("invested_amount")),
    current_value: num(formData.get("current_value")),
    goal_id: str(formData.get("goal_id")) || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = id
    ? await supabase
        .from("investments")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("investments").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/investments");
}

export async function deleteInvestment(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("investments")
    .delete()
    .eq("id", str(formData.get("id")))
    .eq("user_id", user.id);
  revalidatePath("/investments");
}

// ------------------------------ Profile ------------------------------------
export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({
      name: str(formData.get("name")),
      monthly_income: num(formData.get("monthly_income")),
      currency: str(formData.get("currency"), "INR"),
      savings_target: num(formData.get("savings_target")),
      risk_profile: str(formData.get("risk_profile"), "moderate"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase.from("financial_profile").upsert(
    {
      user_id: user.id,
      monthly_income: num(formData.get("monthly_income")),
      current_cash: num(formData.get("current_cash")),
      rent: num(formData.get("rent")),
      emi: num(formData.get("emi")),
      utilities: num(formData.get("utilities")),
      insurance: num(formData.get("insurance")),
      other_fixed: num(formData.get("other_fixed")),
      food_budget: num(formData.get("food_budget")),
      transport_budget: num(formData.get("transport_budget")),
      savings_target: num(formData.get("savings_target")),
      emergency_fund: num(formData.get("emergency_fund")),
      high_cost_debt: num(formData.get("high_cost_debt")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// ------------------------- SMS import token --------------------------------
// Generates (or rotates) the secret token used by the SMS import webhook.
export async function generateIngestToken() {
  const { supabase, user } = await requireUser();
  const token = `mstk_${crypto.randomUUID().replace(/-/g, "")}${crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  const { error } = await supabase
    .from("profiles")
    .update({ ingest_token: token })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

// ---------------------------- Gmail import ---------------------------------
export async function disconnectGmail() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({ gmail_refresh_token: null, gmail_email: null })
    .eq("id", user.id);
  await supabase.from("gmail_messages").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}

// ------------------------- Agent: weekly envelope --------------------------
// Saves the weekly amount + the L3 limits the agent acts inside. First time,
// the simulated savings pool is seeded from the user's current cash so the
// sweep has something to move.
export async function upsertAgentSettings(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: fin } = await supabase
    .from("financial_profile")
    .select("current_cash")
    .eq("user_id", user.id)
    .maybeSingle();

  const seedPool = Number(fin?.current_cash) || 0;

  const payload = {
    user_id: user.id,
    weekly_amount: num(formData.get("weekly_amount")),
    ask_ceiling: num(formData.get("ask_ceiling"), 2000),
    payday_weekday: Math.round(num(formData.get("payday_weekday"), 1)),
    savings_pool: existing ? existing.savings_pool : seedPool,
    spend_balance: existing ? existing.spend_balance : 0,
    auto_sweep: existing ? existing.auto_sweep : true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("agent_settings")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/agent");
}

// Pause / resume the automatic weekly sweep — the user's instant STOP switch.
export async function setAutoSweep(formData: FormData) {
  const { supabase, user } = await requireUser();
  const on = formData.get("on") === "true";
  await supabase
    .from("agent_settings")
    .update({ auto_sweep: on, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  revalidatePath("/agent");
}

// Runs the (simulated) weekly sweep: move ₹weekly_amount from the savings pool
// into the spend account, inside the user's limits. This is the L3 action.
export async function runWeeklySweep() {
  const { supabase, user } = await requireUser();
  const { data: s } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!s) throw new Error("Set up the envelope first.");

  const amount = Number(s.weekly_amount) || 0;
  if (amount <= 0) throw new Error("No weekly amount set.");
  if (!s.auto_sweep) throw new Error("Sweep is paused.");
  if (Number(s.savings_pool) < amount) {
    // Unhappy path: not enough in savings — the agent asks instead of moving.
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "sweep",
      title: "Weekly top-up needs your input",
      message: `Your savings pool is below this week's ₹${Math.round(
        amount
      )}. Nothing was moved — top up or lower the weekly amount.`,
    });
    revalidatePath("/agent");
    return;
  }

  await supabase
    .from("agent_settings")
    .update({
      savings_pool: Number(s.savings_pool) - amount,
      spend_balance: Number(s.spend_balance) + amount,
      last_sweep_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  await supabase.from("sweeps").insert({
    user_id: user.id,
    amount,
    kind: "weekly",
    note: "Weekly sweep — savings → spend account (simulated)",
    simulated: true,
  });

  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "sweep",
    title: "Payday restored",
    message: `Moved ₹${Math.round(amount)} into your spend account for the week.`,
  });

  revalidatePath("/agent");
  revalidatePath("/dashboard");
}

// Mid-week top-up — proposed by the agent, accepted explicitly by the user.
export async function topUpEnvelope(formData: FormData) {
  const { supabase, user } = await requireUser();
  const amount = num(formData.get("amount"));
  if (amount <= 0) return;
  const { data: s } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!s) return;
  const move = Math.min(amount, Number(s.savings_pool));
  if (move <= 0) return;

  await supabase
    .from("agent_settings")
    .update({
      savings_pool: Number(s.savings_pool) - move,
      spend_balance: Number(s.spend_balance) + move,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  await supabase.from("sweeps").insert({
    user_id: user.id,
    amount: move,
    kind: "topup",
    note: "Mid-week top-up (you approved)",
    simulated: true,
  });
  revalidatePath("/agent");
}

// Answering a weekly question: tag an unexplained transaction, mark explained.
export async function explainTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(formData.get("id"));
  const category = str(formData.get("category"), "Others");
  await supabase
    .from("expenses")
    .update({ category, explained: true, confidence: 1.0 })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/agent");
  revalidatePath("/dashboard");
}

// --------------------------- Notifications ---------------------------------
export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  revalidatePath("/notifications");
}

export async function deleteNotification(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifications")
    .delete()
    .eq("id", str(formData.get("id")))
    .eq("user_id", user.id);
  revalidatePath("/notifications");
}

// ------------------------- Account deletion --------------------------------
export async function deleteAccount() {
  const { supabase, user } = await requireUser();
  // Cascade deletes remove all financial rows (FK on delete cascade).
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // If no service role key, at least sign the user out.
  }
  await supabase.auth.signOut();
  redirect("/");
}
