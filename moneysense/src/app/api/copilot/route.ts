import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/data";
import { askCopilot, type ChatMessage } from "@/lib/ai";

// Simple in-memory rate limiter (per user, per process). For production use a
// durable store (e.g. Upstash). Prevents runaway OpenAI usage.
const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 20;
const WINDOW = 60_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

export async function POST(request: Request) {
  const { userId, ctx } = await getFinanceContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (rateLimited(userId)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let messages: ChatMessage[] = [];
  try {
    const body = await request.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Basic input validation: cap message count and length.
  messages = messages
    .filter((m) => m && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 2000),
    }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  try {
    const answer = await askCopilot(ctx, messages);
    return NextResponse.json({ answer });
  } catch (e: any) {
    console.error("Copilot error", e);
    // Surface the provider's actual reason (invalid key, unknown model, quota…)
    // so misconfiguration is diagnosable instead of a generic failure.
    const status = e?.status ?? e?.response?.status;
    const providerMsg =
      e?.error?.message ||
      e?.response?.data?.error?.message ||
      e?.message ||
      "unknown error";
    return NextResponse.json(
      {
        error: `AI error${status ? ` (${status})` : ""}: ${String(providerMsg).slice(
          0,
          300
        )}`,
      },
      { status: 500 }
    );
  }
}
