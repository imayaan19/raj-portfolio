// Shared domain types for MoneySense AI.

export type PaymentMethod =
  | "UPI"
  | "Credit Card"
  | "Debit Card"
  | "Cash"
  | "Bank Transfer"
  | "Other";

export type TransactionSource =
  | "Manual"
  | "Receipt"
  | "Bank"
  | "Credit Card"
  | "UPI"
  | "SMS"
  | "Email";

export type RiskProfile = "conservative" | "moderate" | "growth" | "aggressive";

export type Category =
  | "Food"
  | "Housing"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Bills"
  | "Travel"
  | "Investments"
  | "Others";

export const CATEGORIES: Category[] = [
  "Food",
  "Housing",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Bills",
  "Travel",
  "Investments",
  "Others",
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "Cash",
  "Bank Transfer",
  "Other",
];

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  monthly_income: number;
  currency: string;
  savings_target: number;
  risk_profile: RiskProfile;
  onboarded: boolean;
  employment_type: string | null;
  ingest_token?: string | null;
  gmail_refresh_token?: string | null;
  gmail_email?: string | null;
  gmail_last_sync?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialProfile {
  id?: string;
  user_id?: string;
  monthly_income: number;
  current_cash: number;
  rent: number;
  emi: number;
  utilities: number;
  food_budget: number;
  transport_budget: number;
  insurance: number;
  other_fixed: number;
  savings_target: number;
  emergency_fund: number;
  high_cost_debt: number;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  merchant: string | null;
  category: Category;
  payment_method: PaymentMethod;
  transaction_date: string; // YYYY-MM-DD
  notes: string | null;
  recurring: boolean;
  source: TransactionSource;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: Category;
  amount: number;
  month: string; // YYYY-MM
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category: string;
  horizon_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  next_payment_date: string | null;
  category: string;
  active: boolean;
  last_used_days: number | null;
  created_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  asset_name: string;
  asset_class: "Equity" | "Debt" | "Cash" | "Gold" | "Other";
  invested_amount: number;
  current_value: number;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

// The consolidated snapshot the finance engine + AI both consume.
export interface FinanceContext {
  profile: Profile | null;
  financial: FinancialProfile | null;
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  investments: Investment[];
}
