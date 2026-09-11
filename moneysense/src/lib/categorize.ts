import type { Category } from "./types";

// Local merchant → category heuristics (mirrors the DB merchant_categories
// table for instant client-side suggestions; the DB is the source of truth
// for learned mappings).
const RULES: { pattern: RegExp; category: Category }[] = [
  { pattern: /zomato|swiggy|dominos|mcdonald|starbucks|kfc|blinkit|zepto|bigbasket|restaurant|cafe|grocery|food/i, category: "Food" },
  { pattern: /uber|ola|rapido|irctc|petrol|fuel|metro|cab|transport|diesel/i, category: "Transport" },
  { pattern: /amazon|flipkart|myntra|ajio|nykaa|shopping|store|mall/i, category: "Shopping" },
  { pattern: /netflix|spotify|prime video|hotstar|bookmyshow|cinema|movie|game/i, category: "Entertainment" },
  { pattern: /pharmeasy|apollo|cult\.?fit|gym|hospital|clinic|medical|health|pharmacy/i, category: "Health" },
  { pattern: /byju|udemy|coursera|unacademy|course|tuition|school|college|education/i, category: "Education" },
  { pattern: /electricity|airtel|jio|google one|broadband|water|gas|bill|recharge|insurance/i, category: "Bills" },
  { pattern: /makemytrip|goibibo|indigo|oyo|hotel|flight|travel|trip/i, category: "Travel" },
  { pattern: /rent|landlord|maintenance|society/i, category: "Housing" },
  { pattern: /mutual fund|sip|stock|zerodha|groww|invest/i, category: "Investments" },
];

export function suggestCategory(merchant: string): Category {
  const m = (merchant || "").trim().toLowerCase();
  if (!m) return "Others";
  for (const rule of RULES) {
    if (rule.pattern.test(m)) return rule.category;
  }
  return "Others";
}
