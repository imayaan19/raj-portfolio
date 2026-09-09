import { getFinanceContext } from "@/lib/data";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";
  return (
    <div>
      <PageHeader
        title="Subscriptions & Recurring Expenses"
        description="Track recurring payments, see their annual cost, and flag unused services."
      />
      <SubscriptionManager subscriptions={ctx.subscriptions} currency={currency} />
    </div>
  );
}
