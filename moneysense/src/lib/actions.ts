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
