"use client";

import { useRef, useState } from "react";
import { addExpense } from "@/lib/actions";
import { suggestCategory } from "@/lib/categorize";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
import { Card, CardContent, Button, Input, Label, Select, Alert, Badge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Sparkles, Loader2, Check, Camera, Upload } from "lucide-react";

export default function AddExpensePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("Others");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [autoPicked, setAutoPicked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Receipt scanning state
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function onMerchantChange(value: string) {
    setMerchant(value);
    const s = suggestCategory(value);
    if (value.trim() && s !== "Others") {
      setSuggested(s);
      if (!autoPicked || category === "Others") setCategory(s);
    } else {
      setSuggested(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanMsg(null);
    setLineItems([]);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (data.draft) {
        setAmount(String(data.draft.amount || ""));
        setMerchant(data.draft.merchant || "");
        setDate(data.draft.date || today);
        setCategory(data.draft.category || "Others");
        setLineItems(data.draft.lineItems || []);
        setScanMsg("Extracted from receipt — please review before saving.");
      } else {
        setScanMsg(data.note || data.error || "Could not read the receipt.");
      }
    } catch {
      setScanMsg("Could not read the receipt. Enter details manually.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add Expense"
        description="Log a transaction in seconds. Scan a receipt or type it in."
      />

      {/* Receipt scan */}
      <Card className="mb-4">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4 text-primary" /> Scan a receipt
              </p>
              <p className="text-xs text-muted-foreground">
                Upload an image or PDF; we&apos;ll extract the details for you to confirm.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={onFile}
            />
          </div>
          {scanMsg && (
            <Alert tone="info" className="mt-3">
              {scanMsg}
            </Alert>
          )}
          {lineItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lineItems.map((li, i) => (
                <Badge key={i} tone="muted">
                  {li}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form
            action={async (fd) => {
              setLoading(true);
              await addExpense(fd);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-14 text-2xl font-semibold"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="merchant">Merchant</Label>
              <Input
                id="merchant"
                name="merchant"
                value={merchant}
                onChange={(e) => onMerchantChange(e.target.value)}
                placeholder="e.g. Zomato, Amazon, Uber"
              />
              {suggested && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Suggested category:{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(suggested);
                      setAutoPicked(true);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    {suggested}
                  </button>
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setAutoPicked(true);
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_method">Payment method</Label>
                <Select id="payment_method" name="payment_method" defaultValue="UPI">
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="transaction_date">Date</Label>
              <Input
                id="transaction_date"
                name="transaction_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" name="notes" placeholder="Add a note" />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border p-3">
              <input type="checkbox" name="recurring" className="h-4 w-4 accent-emerald-500" />
              <div>
                <p className="text-sm font-medium">Recurring expense</p>
                <p className="text-xs text-muted-foreground">
                  Mark if this repeats (rent, subscription, EMI).
                </p>
              </div>
            </label>

            <input type="hidden" name="source" value={lineItems.length ? "Receipt" : "Manual"} />

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save expense
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Saving updates your dashboard, budgets, analytics, insights &amp; surplus.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
