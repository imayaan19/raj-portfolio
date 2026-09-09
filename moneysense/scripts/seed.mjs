// ---------------------------------------------------------------------------
// MoneySense AI — Demo data seeder.
//
// Creates (or reuses) a demo user and populates realistic finances so the
// product's intelligence is visible immediately after login.
//
// Usage:
//   node scripts/seed.mjs
//
// Requires in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   NEXT_PUBLIC_DEMO_EMAIL (optional), DEMO_PASSWORD (optional)
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Minimal .env.local loader (no dotenv dependency required).
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env.local optional if env vars already set.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.NEXT_PUBLIC_DEMO_EMAIL || "demo@moneysense.ai";
const password = process.env.DEMO_PASSWORD || "Demo123!moneysense";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dateThisMonth(day) {
  const now = new Date();
  return ymd(new Date(now.getFullYear(), now.getMonth(), day));
}
function dateLastMonth(day) {
  const now = new Date();
  return ymd(new Date(now.getFullYear(), now.getMonth() - 1, day));
}

async function getOrCreateUser() {
  // Try to find an existing demo user.
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    console.log("Reusing existing demo user:", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Raj Sharma" },
  });
  if (error) throw error;
  console.log("Created demo user:", data.user.id);
  return data.user.id;
}

async function wipe(userId) {
  const tables = [
    "expenses",
    "budgets",
    "goals",
    "subscriptions",
    "investments",
    "notifications",
    "recurring_transactions",
    "financial_profile",
  ];
  for (const t of tables) {
    await supabase.from(t).delete().eq("user_id", userId);
  }
}

async function seed() {
  const userId = await getOrCreateUser();
  await wipe(userId);

  // Profile
  await supabase.from("profiles").upsert({
    id: userId,
    name: "Raj Sharma",
    email,
    monthly_income: 80000,
    currency: "INR",
    savings_target: 20000,
    risk_profile: "growth",
    employment_type: "Salaried",
    onboarded: true,
    updated_at: new Date().toISOString(),
  });

  // Financial profile
  await supabase.from("financial_profile").upsert(
    {
      user_id: userId,
      monthly_income: 80000,
      current_cash: 150000,
      rent: 18000,
      emi: 6000,
      utilities: 2100,
      food_budget: 8000,
      transport_budget: 4000,
      insurance: 1500,
      other_fixed: 1200,
      savings_target: 20000,
      emergency_fund: 140000,
      high_cost_debt: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  // Expenses — current month (higher food) + last month (baseline).
  const method = (i) => ["UPI", "Credit Card", "Debit Card", "Cash", "Bank Transfer"][i % 5];
  const mk = (amount, merchant, category, day, thisMonth = true, pm = 0, recurring = false) => ({
    user_id: userId,
    amount,
    merchant,
    category,
    payment_method: method(pm),
    transaction_date: thisMonth ? dateThisMonth(day) : dateLastMonth(day),
    recurring,
    source: "Manual",
    notes: null,
  });

  const expenses = [
    // ---- This month (food elevated ~26% vs last month) ----
    mk(18000, "Landlord", "Housing", 2, true, 4, true),
    mk(6000, "HDFC Home Loan", "Bills", 2, true, 4, true),
    mk(2100, "Electricity Board", "Bills", 3, true, 0),
    mk(649, "Netflix", "Entertainment", 3, true, 1, true),
    mk(199, "Spotify", "Entertainment", 4, true, 1, true),
    mk(3500, "BigBasket Grocery", "Food", 5, true, 0),
    mk(450, "Zomato", "Food", 6, true, 0),
    mk(620, "Swiggy", "Food", 8, true, 0),
    mk(280, "Uber", "Transport", 9, true, 0),
    mk(520, "Swiggy", "Food", 11, true, 0),
    mk(2400, "Amazon", "Shopping", 12, true, 1),
    mk(1200, "Barbeque Nation", "Food", 13, true, 1),
    mk(180, "Blinkit", "Food", 14, true, 0),
    mk(4800, "Myntra", "Shopping", 15, true, 1),
    mk(320, "Uber", "Transport", 16, true, 0),
    mk(240, "Zomato", "Food", 17, true, 0),
    mk(1500, "Cult.fit Gym", "Health", 18, true, 1, true),
    mk(150, "Blinkit", "Food", 19, true, 0),
    mk(600, "Swiggy", "Food", 20, true, 0),
    mk(210, "Rapido", "Transport", 21, true, 0),
    // ---- Last month (baseline) ----
    mk(18000, "Landlord", "Housing", 2, false, 4, true),
    mk(6000, "HDFC Home Loan", "Bills", 2, false, 4, true),
    mk(1950, "Electricity Board", "Bills", 3, false, 0),
    mk(649, "Netflix", "Entertainment", 3, false, 1, true),
    mk(199, "Spotify", "Entertainment", 4, false, 1, true),
    mk(3200, "BigBasket Grocery", "Food", 6, false, 0),
    mk(400, "Zomato", "Food", 9, false, 0),
    mk(300, "Uber", "Transport", 10, false, 0),
    mk(8000, "Amazon", "Shopping", 12, false, 1),
    mk(900, "Pizza Hut", "Food", 15, false, 1),
    mk(1500, "Cult.fit Gym", "Health", 18, false, 1, true),
    mk(280, "Ola", "Transport", 20, false, 0),
    mk(1100, "Restaurant", "Food", 22, false, 1),
  ];
  await supabase.from("expenses").insert(expenses);

  // Budgets — current month
  const cm = monthKey(new Date());
  await supabase.from("budgets").insert([
    { user_id: userId, category: "Food", amount: 8000, month: cm },
    { user_id: userId, category: "Shopping", amount: 5000, month: cm },
    { user_id: userId, category: "Transport", amount: 4000, month: cm },
    { user_id: userId, category: "Entertainment", amount: 2500, month: cm },
  ]);

  // Goals
  const inMonths = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    return ymd(d);
  };
  await supabase.from("goals").insert([
    { user_id: userId, name: "Europe Trip", target_amount: 300000, current_amount: 120000, target_date: inMonths(12), category: "Travel" },
    { user_id: userId, name: "Emergency Fund", target_amount: 210000, current_amount: 140000, target_date: inMonths(10), category: "Emergency Fund" },
    { user_id: userId, name: "New Car", target_amount: 800000, current_amount: 150000, target_date: inMonths(36), category: "Car" },
  ]);

  // Subscriptions
  await supabase.from("subscriptions").insert([
    { user_id: userId, name: "Netflix", amount: 649, frequency: "monthly", category: "Entertainment", active: true, next_payment_date: dateThisMonth(28), last_used_days: 2 },
    { user_id: userId, name: "Spotify", amount: 199, frequency: "monthly", category: "Entertainment", active: true, next_payment_date: dateThisMonth(25), last_used_days: 1 },
    { user_id: userId, name: "Google One", amount: 130, frequency: "monthly", category: "Bills", active: true, next_payment_date: dateThisMonth(22), last_used_days: 60 },
    { user_id: userId, name: "Cult.fit", amount: 1500, frequency: "monthly", category: "Health", active: true, next_payment_date: dateThisMonth(18), last_used_days: 5 },
    { user_id: userId, name: "Amazon Prime", amount: 1499, frequency: "yearly", category: "Entertainment", active: true, next_payment_date: inMonths(4), last_used_days: 50 },
  ]);

  // Investments
  const { data: goals } = await supabase.from("goals").select("id, name").eq("user_id", userId);
  const europe = goals?.find((g) => g.name === "Europe Trip")?.id || null;
  await supabase.from("investments").insert([
    { user_id: userId, asset_name: "Nifty 50 Index Fund", asset_class: "Equity", invested_amount: 120000, current_value: 138000, goal_id: null },
    { user_id: userId, asset_name: "Corporate Bond Fund", asset_class: "Debt", invested_amount: 80000, current_value: 84500, goal_id: europe },
    { user_id: userId, asset_name: "Digital Gold", asset_class: "Gold", invested_amount: 30000, current_value: 33200, goal_id: null },
    { user_id: userId, asset_name: "Liquid Fund", asset_class: "Cash", invested_amount: 40000, current_value: 40600, goal_id: null },
  ]);

  // Notifications
  await supabase.from("notifications").insert([
    { user_id: userId, type: "welcome", title: "Welcome to MoneySense AI 🎉", message: "Your demo dashboard is ready to explore." },
    { user_id: userId, type: "spending", title: "Food spending is up", message: "Food spending increased 26% vs last month." },
    { user_id: userId, type: "surplus", title: "Potential surplus detected", message: "You may have ~₹15,000 surplus after commitments." },
    { user_id: userId, type: "goal", title: "Europe Trip on track", message: "You're on pace for your travel goal." },
  ]);

  console.log("\n✅ Demo data seeded.");
  console.log(`   Login: ${email} / ${password}\n`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
