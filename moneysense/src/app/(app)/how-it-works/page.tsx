import Link from "next/link";
import { ArrowLeft, Mic, CircleDot } from "lucide-react";
import { getFinanceContext, getAgentData } from "@/lib/data";
import { explainedSpend } from "@/lib/agent";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

type Status = "live" | "partial" | "planned";
interface StateNode {
  id: string;
  title: string;
  desc: string;
  status: Status;
}

const HAPPY: StateNode[] = [
  { id: "S0", title: "Onboard & consent", desc: "Link accounts (Account Aggregator); set payday, weekly amount, approval ceiling.", status: "live" },
  { id: "S1", title: "Learn baseline", desc: "Pull history; learn merchant→category, income cycle, fixed bills.", status: "live" },
  { id: "S2", title: "Set weekly allowance", desc: "Propose ₹X/week; the user says yes once; register the sweep mandate.", status: "live" },
  { id: "S3", title: "Listen", desc: "New debit/credit arrives; de-duplicate on reference; loops for every transaction.", status: "live" },
  { id: "S4", title: "Explain", desc: "Auto-tag when confident; update the explained-spend % and what's safe to spend.", status: "live" },
  { id: "S5", title: "Weekly sweep (L3)", desc: "Notice ahead → move ₹X savings → spend account. Voice digest of spent / left / biggest leak.", status: "live" },
  { id: "S6", title: "Month close = done", desc: "≥95% of spend explained, zero pending; month report; learnings carried forward.", status: "live" },
];

const UNHAPPY: StateNode[] = [
  { id: "U2", title: "Data feed broken", desc: "Consent expired / fetch fails → show 'data stale since…', never treat missing data as zero spend.", status: "live" },
  { id: "U3", title: "Sweep fails (low balance)", desc: "No blind retry; skip the week and tell the user; two fails in a row pause the mandate.", status: "live" },
  { id: "U4", title: "Allowance runs out mid-week", desc: "Alert + propose a top-up (L2); moves money only on an explicit yes.", status: "live" },
  { id: "U5", title: "Outside limits", desc: "Amount over ceiling, or a new payee → never acts, asks first.", status: "live" },
  { id: "U6", title: "User says STOP", desc: "Pause the mandate at once → read-only; resumes when the user says so.", status: "live" },
  { id: "U8", title: "Month closes < 95%", desc: "Not marked done; carry over and list what's still unexplained into next month.", status: "live" },
  { id: "U7", title: "Money owed back", desc: "Order returned or UPI failed-but-debited; flag & remind until the refund lands.", status: "planned" },
];

function StatusBadge({ status }: { status: Status }) {
  if (status === "live") return <Badge tone="success">Live in app</Badge>;
  if (status === "partial") return <Badge tone="warning">Partial</Badge>;
  return <Badge tone="muted">Planned · receipts rail</Badge>;
}

function StateCard({ node, tone }: { node: StateNode; tone: "happy" | "unhappy" }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === "happy"
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          <span className="text-muted-foreground">{node.id}</span> · {node.title}
        </span>
        <StatusBadge status={node.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{node.desc}</p>
    </div>
  );
}

export default async function HowItWorksPage() {
  const { ctx } = await getFinanceContext();
  const { settings } = await getAgentData();
  const es = explainedSpend(ctx);

  const liveCount = [...HAPPY, ...UNHAPPY].filter((s) => s.status === "live").length;
  const total = HAPPY.length + UNHAPPY.length + 1; // +1 voice node

  return (
    <div className="space-y-6">
      <PageHeader
        title="How the agent works"
        description="Our Round 2 state design — and which states are live in this build."
        action={
          <Link href="/agent" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to agent
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Badge tone="success">{liveCount} of {total} states live</Badge>
        <Badge tone="info">Explained now: {Math.round(es.percent)}%</Badge>
        <Badge tone={settings?.weekly_amount ? "success" : "muted"}>
          Envelope {settings?.weekly_amount ? "set" : "not set"}
        </Badge>
        <Badge tone={ctx.profile?.gmail_refresh_token ? "success" : "muted"}>
          Data feed {ctx.profile?.gmail_refresh_token ? "connected" : "demo data"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Happy flow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {HAPPY.map((n) => (
            <StateCard key={n.id} node={n} tone="happy" />
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Anytime · voice question</span>
                <Badge tone="success">Live in app</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                &ldquo;Where did my money go last week?&rdquo; — answered from the
                tagged ledger, by voice or text, on the Agent page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unhappy flow — each returns to a safe state</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {UNHAPPY.map((n) => (
            <StateCard key={n.id} node={n} tone="unhappy" />
          ))}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 pb-2 text-center text-xs text-muted-foreground">
        <CircleDot className="h-3.5 w-3.5" />
        &ldquo;Planned&rdquo; states depend on the receipts rail (Q5) — the one
        capability we specified as must-be-built.
      </p>
    </div>
  );
}
