import { createClient } from "@/lib/supabase/server";
import type {
  Budget,
  Expense,
  FinanceContext,
  FinancialProfile,
  Goal,
  Investment,
  Notification,
  Profile,
  Subscription,
} from "./types";

// Loads the full finance context for the authenticated user. RLS guarantees
// only the current user's rows are returned.
export async function getFinanceContext(): Promise<{
  userId: string | null;
  ctx: FinanceContext;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      ctx: {
        profile: null,
        financial: null,
        expenses: [],
        budgets: [],
        goals: [],
        subscriptions: [],
        investments: [],
      },
    };
  }

  const [profile, financial, expenses, budgets, goals, subs, investments] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("financial_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase.from("subscriptions").select("*").eq("user_id", user.id),
      supabase.from("investments").select("*").eq("user_id", user.id),
    ]);

  return {
    userId: user.id,
    ctx: {
      profile: (profile.data as Profile) ?? null,
      financial: (financial.data as FinancialProfile) ?? null,
      expenses: (expenses.data as Expense[]) ?? [],
      budgets: (budgets.data as Budget[]) ?? [],
      goals: (goals.data as Goal[]) ?? [],
      subscriptions: (subs.data as Subscription[]) ?? [],
      investments: (investments.data as Investment[]) ?? [],
    },
  };
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Notification[]) ?? [];
}
