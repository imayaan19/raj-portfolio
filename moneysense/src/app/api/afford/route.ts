import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/data";
import { affordability, simulateInvestment } from "@/lib/finance";

export async function POST(request: Request) {
  const { userId, ctx } = await getFinanceContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let amount = 0;
  let name = "";
  try {
    const body = await request.json();
    amount = Math.max(0, Number(body.amount) || 0);
    name = String(body.name || "").slice(0, 80);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  const result = affordability(ctx, amount, name);

  // "Invest or spend?" — illustrative growth of the same amount over 5 years.
  const invested5y = simulateInvestment(amount, 0, 5, 10);
  const lowerCost = Math.round(amount * 0.66);
  const preserved = amount - lowerCost;

  return NextResponse.json({
    result,
    investOrSpend: {
      buyImpact: -amount,
      investedIn5Years: Math.round(invested5y.futureValue),
      assumedReturn: 10,
      lowerCostOption: lowerCost,
      cashPreserved: preserved,
    },
  });
}
