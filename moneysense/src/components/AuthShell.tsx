import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden flex-col justify-between bg-secondary p-12 text-secondary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">MoneySense AI</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Don&apos;t just tell me where my money went.
            <span className="block text-primary">
              Help me decide what my money should do next.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-secondary-foreground/70">
            Track → Understand → Predict → Decide → Allocate → Grow.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-secondary-foreground/70">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Your financial information is private to your account.
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">MoneySense AI</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
