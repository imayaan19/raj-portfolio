"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  PiggyBank,
  Target,
  BarChart3,
  Bot,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  Settings,
  Bell,
  Sparkles,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/add", label: "Add Expense", icon: PlusCircle },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/afford", label: "Can I Afford This?", icon: ShoppingCart },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { href: "/settings", label: "Profile / Settings", icon: Settings },
];

// Primary items shown in the mobile bottom bar.
const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Activity", icon: Receipt },
  { href: "/add", label: "Add", icon: PlusCircle },
  { href: "/copilot", label: "Copilot", icon: Bot },
  { href: "/investments", label: "Invest", icon: TrendingUp },
];

export function Sidebar({
  userName,
  unread,
}: {
  userName: string;
  unread: number;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card px-3 py-5 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">MoneySense</span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-3 space-y-1 border-t border-border pt-3">
        <Link
          href="/notifications"
          className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <span className="flex items-center gap-3">
            <Bell className="h-[18px] w-[18px]" /> Notifications
          </span>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function MobileTopBar({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">MoneySense</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative rounded-lg p-2 hover:bg-muted">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 top-14 z-20 bg-background lg:hidden">
          <nav className="space-y-1 p-4">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <form action="/auth/signout" method="post" className="pt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger hover:bg-muted"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </form>
          </nav>
        </div>
      )}
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur lg:hidden">
      {MOBILE_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const isAdd = item.href === "/add";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isAdd ? (
              <span className="flex h-11 w-11 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated">
                <item.icon className="h-6 w-6" />
              </span>
            ) : (
              <item.icon className="h-5 w-5" />
            )}
            {!isAdd && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
