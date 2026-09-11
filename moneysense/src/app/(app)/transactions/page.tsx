import Link from "next/link";
import { getFinanceContext } from "@/lib/data";
import { TransactionsTable } from "@/components/TransactionsTable";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { ctx } = await getFinanceContext();
  const currency = ctx.profile?.currency || "INR";

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Search, filter and manage all your expenses."
        action={
          <Link href="/add">
            <Button>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </Link>
        }
      />
      <TransactionsTable expenses={ctx.expenses} currency={currency} />
    </div>
  );
}
