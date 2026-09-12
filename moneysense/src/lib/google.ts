// ---------------------------------------------------------------------------
// Google OAuth + Gmail helpers for auto-importing bank transaction emails.
// Uses only fetch() against Google's REST endpoints (no SDK needed).
// ---------------------------------------------------------------------------

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function redirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/gmail/callback`;
}

// Build the Google consent screen URL. `state` carries the user id so the
// callback can attribute the tokens to the right account.
export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline", // needed to receive a refresh_token
    prompt: "consent", // force a refresh_token every time
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function getGmailAddress(accessToken: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.emailAddress || "";
}

export interface GmailMessage {
  id: string;
  text: string;
  from: string;
  subject: string;
  date: string;
}

// Search recent bank-like emails and return their extracted text.
export async function fetchBankEmails(
  accessToken: string,
  max = 25
): Promise<GmailMessage[]> {
  // Broad query; the transaction parser rejects anything that isn't a spend.
  const q =
    'newer_than:30d (debited OR "debit" OR spent OR "transaction" OR "txn" OR "you paid" OR "purchase") -in:promotions -in:spam';
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(
      q
    )}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${await listRes.text()}`);
  const list = await listRes.json();
  const ids: string[] = (list.messages || []).map((m: any) => m.id);

  const out: GmailMessage[] = [];
  for (const id of ids) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const headers: any[] = msg.payload?.headers || [];
      const header = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name)?.value || "";
      const text = extractBody(msg.payload) || msg.snippet || "";
      out.push({
        id,
        text,
        from: header("from"),
        subject: header("subject"),
        date: header("date"),
      });
    } catch {
      // skip a message that fails to load
    }
  }
  return out;
}

// Walk the MIME tree and pull readable text (prefer text/plain).
function extractBody(payload: any): string {
  if (!payload) return "";
  const decode = (data?: string) => {
    if (!data) return "";
    try {
      return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    } catch {
      return "";
    }
  };

  const collect = (part: any, wantHtml: boolean): string => {
    if (!part) return "";
    const mime = part.mimeType || "";
    if (mime === (wantHtml ? "text/html" : "text/plain") && part.body?.data) {
      return decode(part.body.data);
    }
    if (part.parts) {
      return part.parts.map((p: any) => collect(p, wantHtml)).join("\n");
    }
    return "";
  };

  const plain = collect(payload, false).trim();
  if (plain) return plain;
  const html = collect(payload, true);
  return stripHtml(html);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8377;|&rupee;/gi, "₹")
    .replace(/\s{2,}/g, " ")
    .trim();
}
