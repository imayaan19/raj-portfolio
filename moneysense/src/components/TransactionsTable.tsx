"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, PAYMENT_METHODS, type Expense } from "@/lib/types";
import { updateExpense, deleteExpense } from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { monthKey, monthLabel } from "@/lib/finance";
import { Card, Button, Input, Select, Badge, EmptyState } from "@/components/ui";
import {
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Receipt,
  X,
  RefreshCw,
} from "lucide-react";

const PAGE_SIZE = 12;

export function TransactionsTable({
  expenses,
  currency,
}: {
  expenses: Expense[];
  currency: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [method, setMethod] = useState("all");
  const [month, setMonth] = useState("all");
  const [sortKey, setSortKey] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Expense | null>(null);

  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => monthKey(e.transaction_date)));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() => {
    let list = expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (method !== "all" && e.payment_method !== method) return false;
      if (month !== "all" && monthKey(e.transaction_date) !== month) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(e.merchant || "").toLowerCase().includes(q) &&
          !(e.notes || "").toLowerCase().includes(q) &&
          !e.category.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    list = list.sort((a, b) => {
      const av = sortKey === "amount" ? a.amount : new Date(a.transaction_date).getTime();
      const bv = sortKey === "amount" ? b.amount : new Date(b.transaction_date).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [expenses, category, method, month, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  function toggleSort(key: "date" | "amount") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Add your first expense and it will show up here with search, filters and totals."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search merchant, note…"
              className="pl-9"
            />
          </div>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <Select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}>
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} transaction{filtered.length !== 1 && "s"}
          </span>
          <span>
            Total: <b className="text-foreground">{formatCurrency(total, currency)}</b>
          </span>
        </div>
      </Card>

      {/* Table (desktop) */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <button className="flex items-center gap-1" onClick={() => toggleSort("date")}>
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">
                <button className="ml-auto flex items-center gap-1" onClick={() => toggleSort("amount")}>
                  Amount <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3">
                  {new Date(t.transaction_date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{t.merchant || "—"}</div>
                  {t.notes && (
                    <div className="text-xs text-muted-foreground">{t.notes}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone="muted">{t.category}</Badge>
                  {t.recurring && (
                    <RefreshCw className="ml-1 inline h-3 w-3 text-muted-foreground" />
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.payment_method}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(t.amount, currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(t)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Cards (mobile) */}
      <div className="space-y-2 md:hidden">
        {pageItems.map((t) => (
          <Card key={t.id} className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{t.merchant || t.category}</p>
              <p className="text-xs text-muted-foreground">
                {t.category} · {t.payment_method} ·{" "}
                {new Date(t.transaction_date).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatCurrency(t.amount, currency)}</span>
              <button onClick={() => setEditing(t)} className="p-1 text-muted-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <form action={deleteExpense}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="p-1 text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          expense={editing}
          currency={currency}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EditModal({
  expense,
  onClose,
}: {
  expense: Expense;
  currency: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold">Edit transaction</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          action={async (fd) => {
            await updateExpense(fd);
            onClose();
          }}
          className="space-y-3 p-4"
        >
          <input type="hidden" name="id" value={expense.id} />
          <div>
            <label className="mb-1 block text-sm font-medium">Amount</label>
            <Input name="amount" type="number" step="0.01" defaultValue={expense.amount} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Merchant</label>
            <Input name="merchant" defaultValue={expense.merchant || ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <Select name="category" defaultValue={expense.category}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Method</label>
              <Select name="payment_method" defaultValue={expense.payment_method}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <Input name="transaction_date" type="date" defaultValue={expense.transaction_date} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <Input name="notes" defaultValue={expense.notes || ""} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="recurring"
              defaultChecked={expense.recurring}
              className="h-4 w-4 accent-emerald-500"
            />
            Recurring
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
