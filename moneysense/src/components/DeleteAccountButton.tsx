"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/actions";
import { Button, Card, Input } from "@/components/ui";
import { X } from "lucide-react";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold text-danger">Delete account</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">
                This permanently deletes your account and all financial data
                (expenses, budgets, goals, subscriptions, investments). This cannot
                be undone. Type <b>DELETE</b> to confirm.
              </p>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
              <form action={deleteAccount} className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={confirm !== "DELETE"}>
                  Permanently delete
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
