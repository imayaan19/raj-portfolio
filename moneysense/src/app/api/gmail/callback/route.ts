import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getGmailAddress } from "@/lib/google";

export const dynamic = "force-dynamic";

// Google redirects here after consent. Exchange the code, store the refresh
// token on the signed-in user's profile.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) return NextResponse.redirect(`${origin}/settings?gmail=denied`);
  if (!code) return NextResponse.redirect(`${origin}/settings?gmail=error`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the user previously granted access without revoking; ask
      // them to remove access and reconnect so we get a fresh refresh token.
      return NextResponse.redirect(`${origin}/settings?gmail=norefresh`);
    }
    const email = await getGmailAddress(tokens.access_token);
    await supabase
      .from("profiles")
      .update({
        gmail_refresh_token: tokens.refresh_token,
        gmail_email: email,
      })
      .eq("id", user.id);
    return NextResponse.redirect(`${origin}/settings?gmail=connected`);
  } catch (e) {
    console.error("Gmail callback error", e);
    return NextResponse.redirect(`${origin}/settings?gmail=error`);
  }
}
