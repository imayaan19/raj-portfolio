import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildConsentUrl, googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

// Kicks off the Google consent flow for the signed-in user.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/settings?gmail=notconfigured`);
  }

  // state = user id, so the callback knows whose tokens these are.
  return NextResponse.redirect(buildConsentUrl(user.id));
}
