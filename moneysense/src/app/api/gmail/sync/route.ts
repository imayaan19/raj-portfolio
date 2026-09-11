import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGmailForUser } from "@/lib/gmail-sync";

export const dynamic = "force-dynamic";

// Manual "Sync now" — pulls the signed-in user's recent bank emails.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("gmail_refresh_token")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.gmail_refresh_token) {
    return NextResponse.json({ error: "Gmail not connected." }, { status: 400 });
  }

  try {
    const result = await syncGmailForUser(supabase, user.id, profile.gmail_refresh_token);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Gmail sync error", e);
    return NextResponse.json({ error: "Sync failed. Please try again." }, { status: 500 });
  }
}
