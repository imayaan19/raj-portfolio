import Link from "next/link";
import {
  Wallet,
  ShieldCheck,
  CircleHelp,
  RefreshCw,
  Play,
  ArrowRightLeft,
  Pause,
  Info,
  CheckCircle2,
  Mic,
  Rss,
  ArrowRight,
} from "lucide-react";
import { getFinanceContext, getAgentData } from "@/lib/data";
import {
  explainedSpend,
  envelopeStatus,
  weeklyDigest,
  planWeeklySweep,
  weekdayLabel,
} from "@/lib/agent";
import {
  upsertAgentSettings,
  setAutoSweep,
  runWeeklySweep,
  topUpEnvelope,
  explainTransaction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { DigestVoice } from "@/components/DigestVoice";
import { LedgerVoiceAsk } from "@/components/LedgerVoiceAsk";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  Badge,
  Alert,
  ProgressBar,
  EmptyState,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function ScoreRing({ percent, meets }: { percent: number; meets: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const dash = (pct / 100) * c;
  const color = meets ? "#10b981" : pct >= 80 ? "#f59e0b" : "#ef4444";
  return (
    <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
      <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
      <text
        x="64"
        y="60"
        textAnchor="middle"
        dominantBaseline="middle"
        className="rotate-90 fill-foreground text-[22px] font-bold"
        transform="rotate(90 64 64)"
      >
        {Math.round(pct)}%
      </text>
      <text
        x="64"
        y="82"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground text-[10px]"
        transform="rotate(90 64 64)"
      >
        explained
      </text>
    </svg>
  );
}

export default async function AgentPage() {
  const { ctx } = await getFinanceContext();
  const { settings, sweeps } = await getAgentData();
  const currency = ctx.profile?.currency || "INR";

  const es = explainedSpend(ctx);
  const env = envelopeStatus(ctx, settings);
  const digest = weeklyDigest(ctx, settings);
  const plan = planWeeklySweep(settings);

  const isSetUp = !!settings && settings.weekly_amount > 0;
  const autoSweep = settings?.auto_sweep ?? true;

  const envTone =
    env.state === "overspent" ? "danger" : env.state === "watch" ? "warning" : "success";

  return (
    <div className="space-y-6">
      <PageHeader
        title="MoneySense Agent"
        description="Account for your spending automatically, and never run out before your weekly top-up."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              How it works <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Badge tone="info">Autonomy L3</Badge>
          </div>
        }
      />

      <Alert tone="info">
        <span className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Build-round prototype.</strong> The weekly sweep here is{" "}
            <strong>simulated</strong> — real movement between your own bank
            accounts is the Pine Labs <em>self-sweep mandate</em> we specified as
            &ldquo;must be built&rdquo;. Everything else runs on your real
            MoneySense data.
          </span>
        </span>
      </Alert>

      {/* Explained-spend score + weekly envelope */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Explained-spend score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <ScoreRing percent={es.percent} meets={es.meetsTarget} />
              <div className="space-y-1.5 text-sm">
                <p>
                  <span className="font-semibold">
                    {formatCurrency(es.explainedValue, currency)}
                  </span>{" "}
                  of {formatCurrency(es.totalValue, currency)} accounted for this
                  month.
                </p>
                <p className="text-muted-foreground">
                  Target: <span className="font-medium text-foreground">95%</span>{" "}
                  by value, with zero pending questions.
                </p>
                {es.meetsTarget ? (
                  <Badge tone="success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Target met
                  </Badge>
                ) : (
                  <Badge tone="warning">
                    <CircleHelp className="h-3.5 w-3.5" /> {es.pendingCount} to
                    explain
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>This week&rsquo;s envelope</CardTitle>
              <Badge tone={envTone}>{env.message}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isSetUp ? (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tracking-tight">
                      {formatCurrency(Math.max(env.left, 0), currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      left of {formatCurrency(env.weeklyAmount, currency)} · {env.daysLeftInWeek} day(s)
                      to next top-up
                    </p>
                  </div>
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <ProgressBar
                  value={env.percentUsed}
                  tone={env.state === "overspent" ? "danger" : env.state === "watch" ? "warning" : "success"}
                />
                <p className="text-xs text-muted-foreground">
                  Spent this week: {formatCurrency(env.spentThisWeek, currency)}
                </p>
                {env.state === "overspent" && settings && settings.savings_pool > 0 && (
                  <form action={topUpEnvelope} className="flex items-center gap-2 pt-1">
                    <input type="hidden" name="amount" value={Math.round(-env.left)} />
                    <Button size="sm" variant="outline" type="submit">
                      <ArrowRightLeft className="h-4 w-4" /> Top up{" "}
                      {formatCurrency(-env.left, currency)} from savings
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set a weekly amount below to start the envelope.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monday digest */}
      <Card className="border-primary/30 bg-gradient-to-br from-accent to-card">
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <DigestVoice text={digest.message} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Monday digest</span>
                <Badge tone="muted">Voice note · Gnani in production</Badge>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                &ldquo;{digest.message}&rdquo;
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                An update, not a question — it doesn&rsquo;t count toward the
                &ldquo;three questions a week&rdquo; limit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ask about your money (voice question node) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4" /> Ask about your money
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Ask by voice or text — answered from your tagged ledger and read back
            aloud. (Browser voice here; Gnani in production.)
          </p>
          <LedgerVoiceAsk />
        </CardContent>
      </Card>

      {/* Data-feed status (the U2 state) */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <Rss className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Transaction feed</p>
              <p className="text-xs text-muted-foreground">
                {ctx.profile?.gmail_refresh_token
                  ? `Connected${
                      ctx.profile?.gmail_last_sync
                        ? ` · last synced ${new Date(
                            ctx.profile.gmail_last_sync
                          ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : ""
                    }`
                  : "Using demo data — connect Gmail in Settings for a live feed."}
              </p>
            </div>
          </div>
          <Badge tone={ctx.profile?.gmail_refresh_token ? "success" : "muted"}>
            {ctx.profile?.gmail_refresh_token ? "Live" : "Demo"}
          </Badge>
        </CardContent>
      </Card>

      {/* Weekly questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>This week&rsquo;s questions</CardTitle>
            <Badge tone={es.weeklyQuestions.length ? "warning" : "success"}>
              {es.weeklyQuestions.length} / 3
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {es.weeklyQuestions.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing to ask"
              description="Every payment is explained. The agent stays quiet until it isn't sure."
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                The agent held every unclear payment and asks about the three
                largest, once. Each shows date, amount and payee to jog memory.
              </p>
              <div className="space-y-3">
                {es.weeklyQuestions.map((t) => (
                  <form
                    key={t.id}
                    action={explainTransaction}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {formatCurrency(t.amount, currency)} · {t.merchant || "Unknown payee"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.transaction_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {t.upi_reference ? ` · ref ${t.upi_reference}` : ""} · {t.source}
                      </p>
                    </div>
                    <Select name="category" defaultValue={t.category} className="w-40">
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                    <Button size="sm" type="submit">
                      Explain
                    </Button>
                  </form>
                ))}
              </div>
              {es.pendingCount > 3 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {es.pendingCount - 3} more held for next week — largest first, so
                  the 95%-by-value target is protected.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Autonomy fence + sweep */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>The weekly sweep (L3 action)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              The riskiest thing the agent does alone: every {settings ? weekdayLabel(settings.payday_weekday) : "Monday"} it
              moves your chosen amount from savings into your spend account —
              only that amount, only between your own accounts, with notice, and
              paused instantly on STOP.
            </p>
            {settings && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Savings pool</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(settings.savings_pool, currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Spend account</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(settings.spend_balance, currency)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <form action={runWeeklySweep}>
                <Button type="submit" disabled={!plan.eligible}>
                  <RefreshCw className="h-4 w-4" /> Run weekly sweep
                </Button>
              </form>
              <form action={setAutoSweep}>
                <input type="hidden" name="on" value={(!autoSweep).toString()} />
                <Button type="submit" variant={autoSweep ? "outline" : "primary"}>
                  {autoSweep ? (
                    <>
                      <Pause className="h-4 w-4" /> STOP auto-sweep
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Resume
                    </>
                  )}
                </Button>
              </form>
            </div>
            <p className={`text-xs ${plan.eligible ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {plan.reason}
            </p>

            {sweeps.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Sweep ledger
                </p>
                <div className="space-y-2">
                  {sweeps.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {s.kind === "topup" ? "Top-up" : "Weekly"}
                      </span>
                      <span className="font-medium">
                        +{formatCurrency(s.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup / limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Your limits (the L3 fence)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={upsertAgentSettings} className="space-y-4">
              <div>
                <Label>Weekly amount to sweep</Label>
                <Input
                  name="weekly_amount"
                  type="number"
                  min={0}
                  defaultValue={settings?.weekly_amount || 0}
                  placeholder="e.g. 3500"
                />
              </div>
              <div>
                <Label>Ask me before any move above</Label>
                <Input
                  name="ask_ceiling"
                  type="number"
                  min={0}
                  defaultValue={settings?.ask_ceiling || 2000}
                />
              </div>
              <div>
                <Label>Top-up day</Label>
                <Select
                  name="payday_weekday"
                  defaultValue={String(settings?.payday_weekday ?? 1)}
                >
                  {[
                    ["1", "Monday"],
                    ["2", "Tuesday"],
                    ["3", "Wednesday"],
                    ["4", "Thursday"],
                    ["5", "Friday"],
                    ["6", "Saturday"],
                    ["0", "Sunday"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {isSetUp ? "Save limits" : "Start the envelope"}
              </Button>
              <p className="text-xs text-muted-foreground">
                You approve this rule once. After that the agent acts only inside
                it — capped, announced 24h ahead, and revocable with STOP.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* How this maps to the rails */}
      <Card>
        <CardHeader>
          <CardTitle>How this maps to our Round 2 design</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-border p-3">
            <p className="font-medium">Pine Labs · payments</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The weekly sweep and mid-week top-up are the <em>self-sweep
              mandate</em> we asked to be built. Here: simulated.
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="font-medium">Gnani · voice</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The Monday digest is the 30-second voice note; the weekly questions
              are what the agent asks aloud.
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="font-medium">Receipts rail (4th)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unexplained payments are exactly the gap the receipts rail closes —
              until then, the agent asks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
