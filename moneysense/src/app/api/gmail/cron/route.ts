import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncGmailForUser } from "@/lib/gmail-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled daily sync for every connected user. Invoked by Vercel Cron.
// Protected by CRON_SECRET: Vercel automatically sends it as a Bearer token
// when a CRON_SECRET env var is configured.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  }

  const { data: users } = await admin
    .from("profiles")
    .select("id, gmail_refresh_token")
    .not("gmail_refresh_token", "is", null);

  let totalImported = 0;
  for (const u of users || []) {
    try {
      const r = await syncGmailForUser(admin, u.id, u.gmail_refresh_token);
      totalImported += r.imported;
    } catch {
      // continue with the next user
    }
  }

  return NextResponse.json({ users: users?.length || 0, imported: totalImported });
}
