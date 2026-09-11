import { getFinanceContext } from "@/lib/data";
import { updateProfile } from "@/lib/actions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select, Alert } from "@/components/ui";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { SmsImportPanel } from "@/components/SmsImportPanel";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { ctx } = await getFinanceContext();
  const p = ctx.profile;
  const f = ctx.financial;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Profile & Settings" description="Manage your details and financial profile." />

      <Alert tone="success">
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Your financial information is private to your account and protected by
          row-level security.
        </span>
      </Alert>

      <form action={updateProfile}>
        <Card>
          <CardHeader>
            <CardTitle>Personal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input name="name" defaultValue={p?.name || ""} />
            </div>
            <div>
              <Label>Email</Label>
              <Input defaultValue={p?.email || ""} disabled />
            </div>
            <div>
              <Label>Monthly income</Label>
              <Input name="monthly_income" type="number" defaultValue={f?.monthly_income || p?.monthly_income || 0} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select name="currency" defaultValue={p?.currency || "INR"}>
                {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Monthly savings target</Label>
              <Input name="savings_target" type="number" defaultValue={f?.savings_target || 0} />
            </div>
            <div>
              <Label>Risk profile</Label>
              <Select name="risk_profile" defaultValue={p?.risk_profile || "moderate"}>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="growth">Growth</option>
                <option value="aggressive">Aggressive</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Financial profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Current cash / savings</Label>
              <Input name="current_cash" type="number" defaultValue={f?.current_cash || 0} />
            </div>
            <div>
              <Label>Emergency fund</Label>
              <Input name="emergency_fund" type="number" defaultValue={f?.emergency_fund || 0} />
            </div>
            <div>
              <Label>Rent</Label>
              <Input name="rent" type="number" defaultValue={f?.rent || 0} />
            </div>
            <div>
              <Label>EMI</Label>
              <Input name="emi" type="number" defaultValue={f?.emi || 0} />
            </div>
            <div>
              <Label>Utilities</Label>
              <Input name="utilities" type="number" defaultValue={f?.utilities || 0} />
            </div>
            <div>
              <Label>Insurance</Label>
              <Input name="insurance" type="number" defaultValue={f?.insurance || 0} />
            </div>
            <div>
              <Label>Food budget</Label>
              <Input name="food_budget" type="number" defaultValue={f?.food_budget || 0} />
            </div>
            <div>
              <Label>Transport budget</Label>
              <Input name="transport_budget" type="number" defaultValue={f?.transport_budget || 0} />
            </div>
            <div>
              <Label>Other fixed expenses</Label>
              <Input name="other_fixed" type="number" defaultValue={f?.other_fixed || 0} />
            </div>
            <div>
              <Label>High-cost debt (e.g. credit card)</Label>
              <Input name="high_cost_debt" type="number" defaultValue={f?.high_cost_debt || 0} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <SmsImportPanel
        token={p?.ingest_token ?? null}
        appUrl={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
      />

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
