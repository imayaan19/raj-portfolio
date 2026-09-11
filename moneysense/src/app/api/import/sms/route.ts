import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseTransactionSms } from "@/lib/sms-parse";

// ---------------------------------------------------------------------------
// SMS auto-import webhook.
//
// A phone automation app (MacroDroid / Tasker) forwards bank SMS here:
//   POST /api/import/sms?token=<user ingest_token>
//   body: raw SMS text, or JSON { message, sender }, or form field `message`.
//
// The token identifies the user (there is no browser session on the phone),
// so we use the service-role client and scope every write to that user_id.
// A parsed debit becomes an expense (source: "SMS") plus a review notification.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

// Small per-token rate limit to blunt abuse of a leaked token.
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  e.count += 1;
  return e.count > limit;
}

async function readMessage(request: Request): Promise<{ message: string; sender: string }> {
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      return {
        message: String(body.message ?? body.text ?? body.sms ?? ""),
        sender: String(body.sender ?? body.from ?? ""),
      };
    }
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      return {
        message: String(form.get("message") ?? form.get("text") ?? form.get("sms") ?? ""),
        sender: String(form.get("sender") ?? form.get("from") ?? ""),
      };
    }
  } catch {
    // fall through to raw text
  }
  const raw = await request.text().catch(() => "");
  return { message: raw, sender: "" };
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token =
    searchParams.get("token") || request.headers.get("x-ingest-token") || "";

  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Missing or invalid token." }, { status: 401 });
  }
  if (rateLimited(token)) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server not configured for import (missing service role key)." },
      { status: 500 }
    );
  }

  // Resolve the user from the token.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, currency")
    .eq("ingest_token", token)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Unknown token." }, { status: 401 });
  }

  const { message, sender } = await readMessage(request);
  if (!message.trim()) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const parsed = parseTransactionSms(message);
  if (!parsed.ok) {
    // Not a spend (OTP, credit, promo, unparseable) — acknowledge so the phone
    // app doesn't retry, but record nothing.
    return NextResponse.json({ imported: false, reason: parsed.reason });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: insertErr } = await admin.from("expenses").insert({
    user_id: profile.id,
    amount: parsed.amount,
    merchant: parsed.merchant,
    category: parsed.category,
    payment_method: "UPI",
    transaction_date: today,
    notes: sender ? `Auto-imported from SMS (${sender})` : "Auto-imported from SMS",
    recurring: false,
    source: "SMS",
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Leave a review notification so nothing is silently trusted.
  await admin.from("notifications").insert({
    user_id: profile.id,
    type: "spending",
    title: "New transaction imported from SMS",
    message: `${parsed.merchant} · ${parsed.category} · ${Math.round(
      parsed.amount || 0
    )}. Tap Transactions to review or edit.`,
  });

  return NextResponse.json({
    imported: true,
    amount: parsed.amount,
    merchant: parsed.merchant,
    category: parsed.category,
  });
}

// A convenience GET so users can confirm the URL is reachable from a browser.
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST a bank SMS here with ?token=<your ingest token> to import it.",
  });
}
