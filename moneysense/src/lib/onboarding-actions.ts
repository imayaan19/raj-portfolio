"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface OnboardingGoal {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category: string;
}

export interface OnboardingPayload {
  name: string;
  monthly_income: number;
  currency: string;
  employment_type: string;
  rent: number;
  emi: number;
  utilities: number;
  food_budget: number;
  transport_budget: number;
  insurance: number;
  other_fixed: number;
  current_cash: number;
  emergency_fund: number;
  savings_target: number;
  risk_profile: string;
  goals: OnboardingGoal[];
}

export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("profiles")
    .update({
      name: payload.name,
      monthly_income: payload.monthly_income,
      currency: payload.currency,
      savings_target: payload.savings_target,
      risk_profile: payload.risk_profile,
      employment_type: payload.employment_type,
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase.from("financial_profile").upsert(
    {
      user_id: user.id,
      monthly_income: payload.monthly_income,
      current_cash: payload.current_cash,
      rent: payload.rent,
      emi: payload.emi,
      utilities: payload.utilities,
      food_budget: payload.food_budget,
      transport_budget: payload.transport_budget,
      insurance: payload.insurance,
      other_fixed: payload.other_fixed,
      savings_target: payload.savings_target,
      emergency_fund: payload.emergency_fund,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (payload.goals.length) {
    await supabase.from("goals").insert(
      payload.goals
        .filter((g) => g.name && g.target_amount > 0)
        .map((g) => ({
          user_id: user.id,
          name: g.name,
          target_amount: g.target_amount,
          current_amount: g.current_amount,
          target_date: g.target_date,
          category: g.category,
        }))
    );
  }

  // Seed a welcome notification.
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "welcome",
    title: "Welcome to MoneySense AI 🎉",
    message: "Your personalized dashboard is ready. Add an expense to get started.",
  });

  redirect("/dashboard");
}
