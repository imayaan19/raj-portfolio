import { getFinanceContext } from "@/lib/data";
import { budgetStatuses, currentMonthKey } from "@/lib/finance";
import { BudgetManager } from "@/components/BudgetManager";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";
  const month = currentMonthKey();
  const statuses = budgetStatuses(ctx, month);

  const budgetIds: Record<string, string> = {};
  ctx.budgets
    .filter((b) => b.month === month)
    .forEach((b) => (budgetIds[b.category] = b.id));

  return (
    <div>
      <PageHeader
        title="Budgets"
        description={`Monthly category budgets for ${new Date().toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" }
        )}.`}
      />
      <BudgetManager
        statuses={statuses}
        month={month}
        currency={currency}
        budgetIds={budgetIds}
      />
    </div>
  );
}
