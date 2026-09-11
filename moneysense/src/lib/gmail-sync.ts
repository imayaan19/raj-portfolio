import { refreshAccessToken, fetchBankEmails } from "./google";
import { parseTransactionSms } from "./sms-parse";

export interface SyncResult {
  scanned: number;
  imported: number;
  error?: string;
}

// Pulls recent bank emails for one user, parses spends, and inserts them —
// skipping any Gmail message already processed. `client` may be a user-scoped
// (RLS) client or a service-role client (used by the cron job).
export async function syncGmailForUser(
  client: any,
  userId: string,
  refreshToken: string
): Promise<SyncResult> {
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(refreshToken);
  } catch (e) {
    return { scanned: 0, imported: 0, error: "Could not refresh Google access — please reconnect Gmail." };
  }

  const emails = await fetchBankEmails(accessToken);
  if (emails.length === 0) {
    await client.from("profiles").update({ gmail_last_sync: new Date().toISOString() }).eq("id", userId);
    return { scanned: 0, imported: 0 };
  }

  // Which of these have we already processed?
  const ids = emails.map((e) => e.id);
  const { data: seen } = await client
    .from("gmail_messages")
    .select("gmail_id")
    .eq("user_id", userId)
    .in("gmail_id", ids);
  const seenSet = new Set((seen || []).map((r: any) => r.gmail_id));

  const today = new Date().toISOString().slice(0, 10);
  let imported = 0;
  const processedIds: { user_id: string; gmail_id: string }[] = [];

  for (const email of emails) {
    if (seenSet.has(email.id)) continue;
    processedIds.push({ user_id: userId, gmail_id: email.id });

    const parsed = parseTransactionSms(`${email.subject}\n${email.text}`);
    if (!parsed.ok) continue;

    const { error } = await client.from("expenses").insert({
      user_id: userId,
      amount: parsed.amount,
      merchant: parsed.merchant,
      category: parsed.category,
      payment_method: "Bank Transfer",
      transaction_date: today,
      notes: "Auto-imported from Gmail",
      recurring: false,
      source: "Email",
    });
    if (!error) imported += 1;
  }

  // Mark every scanned message as processed so we never re-parse it.
  if (processedIds.length) {
    await client.from("gmail_messages").upsert(processedIds, { onConflict: "user_id,gmail_id" });
  }

  await client.from("profiles").update({ gmail_last_sync: new Date().toISOString() }).eq("id", userId);

  if (imported > 0) {
    await client.from("notifications").insert({
      user_id: userId,
      type: "spending",
      title: `Imported ${imported} transaction${imported > 1 ? "s" : ""} from Gmail`,
      message: "Open Transactions to review or edit the auto-imported items.",
    });
  }

  return { scanned: emails.length, imported };
}
