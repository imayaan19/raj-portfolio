// Currency + number formatting helpers.

export function formatCurrency(amount: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.round(amount || 0));
  } catch {
    return `${currencySymbol(currency)}${Math.round(amount || 0).toLocaleString(locale)}`;
  }
}

export function currencySymbol(currency = "INR"): string {
  const map: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$",
  };
  return map[currency] ?? currency + " ";
}

export function formatPercent(value: number, digits = 1): string {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatCompact(amount: number, currency = "INR"): string {
  const sym = currencySymbol(currency);
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `${sym}${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${sym}${(amount / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}K`;
  return `${sym}${Math.round(amount)}`;
}

export function signedPercent(value: number): string {
  if (!isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}
