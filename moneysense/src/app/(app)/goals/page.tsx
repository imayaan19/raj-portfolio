import { getFinanceContext } from "@/lib/data";
import { monthlySurplus } from "@/lib/finance";
import { GoalsManager } from "@/components/GoalsManager";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";
  const surplus = monthlySurplus(ctx);

  return (
    <div>
      <PageHeader
        title="Financial Goals"
        description="Track progress and see the monthly contribution each goal needs."
      />
      <GoalsManager goals={ctx.goals} monthlySurplus={surplus} currency={currency} />
    </div>
  );
}
