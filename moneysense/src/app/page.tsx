import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ShieldCheck,
  TrendingUp,
  Wallet,
  LineChart,
  Sparkles,
  PiggyBank,
  Target,
} from "lucide-react";

const differentiators = [
  {
    icon: LineChart,
    title: "Predictive, not reactive",
    trad: "“What did I spend?”",
    us: "“What is likely to happen to my cash balance?”",
  },
  {
    icon: Wallet,
    title: "Decision support",
    trad: "“Here are your expenses.”",
    us: "“Can I afford this purchase?”",
  },
  {
    icon: TrendingUp,
    title: "Financial consequences",
    trad: "“Purchase = ₹20,000.”",
    us: "“This may lower your savings rate and delay your goal.”",
  },
  {
    icon: PiggyBank,
    title: "Surplus intelligence",
    trad: "“Your balance is ₹1,50,000.”",
    us: "“~₹50,000 may be surplus after your reserves.”",
  },
  {
    icon: Brain,
    title: "AI financial copilot",
    trad: "Static dashboards.",
    us: "“Ask me anything about your financial situation.”",
  },
];

const features = [
  { icon: Wallet, title: "Effortless tracking", desc: "Smart categorization, receipt upload, recurring detection." },
  { icon: Brain, title: "AI Copilot", desc: "Grounded in your real numbers — never generic." },
  { icon: Target, title: "Goals & budgets", desc: "See required monthly contributions and on-track status." },
  { icon: TrendingUp, title: "Surplus → investment", desc: "Emergency reserve first, then educational allocation." },
  { icon: LineChart, title: "Cash-flow prediction", desc: "Transparent month-end balance projection." },
  { icon: ShieldCheck, title: "Private by design", desc: "Row-Level Security isolates every user's data." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">MoneySense AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Your AI Financial Copilot
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Don&apos;t just track where your money went.
            <span className="block text-primary">
              Know what it should do next.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            MoneySense AI helps you understand your spending, predict your cash
            flow, decide whether you can afford a purchase, and discover how your
            surplus can support your goals.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login?demo=1"
              className="inline-flex h-12 items-center rounded-xl border border-border px-6 text-base font-medium hover:bg-muted"
            >
              Try the demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Track → Understand → Predict → Decide → Allocate → Grow
          </p>
        </div>
      </section>

      {/* Differentiators */}
      <section className="border-y border-border bg-card/40">
        <div className="container py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            Five things a basic expense tracker won&apos;t do
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {differentiators.map((d) => (
              <div
                key={d.title}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <d.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-through decoration-red-300">
                  {d.trad}
                </p>
                <p className="mt-1 text-sm font-medium text-primary">{d.us}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="rounded-3xl bg-secondary px-8 py-14 text-center text-secondary-foreground">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to make smarter money decisions?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-secondary-foreground/80">
            Join MoneySense AI and turn your data into decisions.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} MoneySense AI. Educational prototype.</p>
          <p>Not investment advice. Your data is private to your account.</p>
        </div>
      </footer>
    </div>
  );
}
