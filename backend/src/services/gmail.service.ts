import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'openid',
  'email',
  'profile',
];

/** A fresh OAuth2 client configured with our web credentials. */
export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );
}

/**
 * Build the Google consent URL. `state` carries the user id so the callback
 * knows which account to attach the tokens to.
 */
export function buildConsentUrl(userId: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // request a refresh token
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state: userId,
    include_granted_scopes: true,
  });
}

/** Exchange the auth code for tokens and persist them against the user. */
export async function saveTokensFromCode(userId: string, code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Grab the connected email for display.
  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email ?? undefined;
  } catch {
    /* non-fatal */
  }

  await prisma.gmailAccount.upsert({
    where: { userId },
    update: {
      email,
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
    create: {
      userId,
      email,
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
  });

  return { email };
}

/** Returns an authed Gmail client for a user, refreshing tokens as needed. */
export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const account = await prisma.gmailAccount.findUnique({ where: { userId } });
  if (!account?.refreshToken && !account?.accessToken) {
    throw new Error('Gmail not connected for this user');
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: account.accessToken ?? undefined,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.expiryDate?.getTime(),
  });

  // Persist refreshed tokens automatically.
  client.on('tokens', async (tokens) => {
    await prisma.gmailAccount.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token ?? account.accessToken,
        refreshToken: tokens.refresh_token ?? account.refreshToken,
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : account.expiryDate,
      },
    });
  });

  return google.gmail({ version: 'v1', auth: client });
}

export interface RawMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  internalDate: Date;
  body: string;
}

/** Search the inbox for the configured keywords and return parsed messages. */
export async function searchMessages(
  userId: string,
  keywords: string[],
  maxResults = 25
): Promise<RawMessage[]> {
  const gmail = await getGmailClient(userId);

  // Scope keywords to the SUBJECT line — feedback/evaluation/survey/deadline
  // announcements put them there, while newsletters (which mention the words
  // only in the body) are filtered out. This keeps the reminder list signal-rich.
  // Set GMAIL_SEARCH_SCOPE=body to search everywhere instead.
  const scopeBody = process.env.GMAIL_SEARCH_SCOPE === 'body';
  const terms = keywords.map((k) => `"${k}"`).join(' OR ');
  const query = scopeBody
    ? `(${terms}) newer_than:90d`
    : `subject:(${terms}) newer_than:90d`;

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
  const messages: RawMessage[] = [];

  for (const id of ids) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });
    messages.push(toRawMessage(full.data));
  }
  return messages;
}

function header(headers: gmail_v1.Schema$MessagePartHeader[], name: string) {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
  );
}

function decodeBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return '';
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  // Walk multipart, prefer text/plain.
  const parts = payload.parts ?? [];
  const plain = parts.find((p) => p.mimeType === 'text/plain');
  if (plain?.body?.data) {
    return Buffer.from(plain.body.data, 'base64').toString('utf-8');
  }
  for (const p of parts) {
    const nested = decodeBody(p);
    if (nested) return nested;
  }
  return '';
}

function toRawMessage(msg: gmail_v1.Schema$Message): RawMessage {
  const headers = msg.payload?.headers ?? [];
  return {
    id: msg.id!,
    subject: header(headers, 'Subject'),
    from: header(headers, 'From'),
    snippet: msg.snippet ?? '',
    internalDate: new Date(Number(msg.internalDate ?? Date.now())),
    body: decodeBody(msg.payload),
  };
}
