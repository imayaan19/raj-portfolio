import { suggestCategory } from "./categorize";
import type { Category } from "./types";

export interface ParsedSms {
  ok: boolean;
  reason?: string;
  amount?: number;
  merchant?: string;
  category?: Category;
  direction?: "debit" | "credit";
}

// Deterministic parser for Indian-style bank / UPI transaction SMS.
// Returns ok:false (with a reason) for anything that isn't a spend, so the
// webhook can safely ignore OTPs, promotions and credits.
export function parseTransactionSms(raw: string): ParsedSms {
  const text = (raw || "").trim();
  if (!text) return { ok: false, reason: "empty" };
  const lower = text.toLowerCase();

  // Ignore OTPs and anything explicitly asking not to share.
  if (/\botp\b|one[-\s]?time password|do not share|verification code/i.test(lower)) {
    return { ok: false, reason: "otp" };
  }

  const isDebit =
    /\b(debited|debit|spent|withdrawn|paid|purchase|deducted|sent)\b/.test(lower);
  const isCredit = /\b(credited|credit|received|refund|deposited)\b/.test(lower);

  // Only capture money going out.
  if (!isDebit && isCredit) return { ok: false, reason: "credit" };
  if (!isDebit && !isCredit) return { ok: false, reason: "no-direction" };

  const amount = extractAmount(text);
  if (amount == null) return { ok: false, reason: "no-amount" };

  const merchant = extractMerchant(text);
  const category = suggestCategory(merchant || "");

  return {
    ok: true,
    amount,
    merchant: merchant || "Unknown",
    category,
    direction: "debit",
  };
}

function extractAmount(text: string): number | null {
  // Match Rs / INR / ₹ followed by a number, e.g. "Rs.1,450.00", "INR 620", "₹280".
  const m = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (m) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (isFinite(n) && n > 0) return n;
  }
  // Fallback: "1450.00 debited" style (number immediately before a debit word).
  const m2 = text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:debited|spent|deducted)/i);
  if (m2) {
    const n = parseFloat(m2[1].replace(/,/g, ""));
    if (isFinite(n) && n > 0) return n;
  }
  return null;
}

function extractMerchant(text: string): string {
  // Common patterns, tried in priority order.
  const patterns: RegExp[] = [
    /UPI[\/:-]\s*([A-Za-z0-9 &._-]{2,40})/i, // UPI/ZOMATO/...
    /\bat\s+([A-Za-z0-9 &._-]{2,40})/i, //  ...spent at SWIGGY
    /\bto\s+([A-Za-z0-9 &._-]{2,40})/i, //  ...debited to AMAZON
    /\bVPA\s+([A-Za-z0-9@._-]{2,40})/i, //  ...VPA merchant@bank
    /\bfor\s+([A-Za-z0-9 &._-]{2,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      let name = m[1].trim();
      // Trim trailing noise (ref numbers, "on", "UPI", dates).
      name = name
        .replace(/\b(on|ref|upi|txn|a\/c|acct|dated|info|via)\b.*$/i, "")
        .replace(/[.\-_]+$/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (name.length >= 2) return titleCase(name);
    }
  }
  return "";
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
