import { NextResponse } from "next/server";
import { getFinanceContext, getAgentData } from "@/lib/data";
import { answerLedgerQuestion } from "@/lib/agent";

// Answers a natural-language money question straight from the user's tagged
// ledger — deterministic, no LLM, RLS-scoped to the signed-in user.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const question = String(body?.question ?? "").slice(0, 300);

  const { userId, ctx } = await getFinanceContext();
  if (!userId) {
    return NextResponse.json({ answer: "Please sign in first." }, { status: 401 });
  }
  const { settings } = await getAgentData();
  const answer = answerLedgerQuestion(ctx, question, settings);
  return NextResponse.json({ answer });
}
