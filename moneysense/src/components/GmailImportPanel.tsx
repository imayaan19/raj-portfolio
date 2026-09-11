"use client";

import { useState } from "react";
import { disconnectGmail } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Badge } from "@/components/ui";
import { Mail, Loader2, RefreshCw, CheckCircle2, Link2 } from "lucide-react";

export function GmailImportPanel({
  connected,
  email,
  lastSync,
  notice,
}: {
  connected: boolean;
  email: string | null;
  lastSync: string | null;
  notice?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function syncNow() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Sync failed.");
      else
        setResult(
          data.imported > 0
            ? `Imported ${data.imported} new transaction${data.imported > 1 ? "s" : ""} from ${data.scanned} scanned emails.`
            : `Scanned ${data.scanned} emails — no new transactions found.`
        );
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const noticeText: Record<string, string> = {
    connected: "Gmail connected successfully 🎉",
    denied: "You declined access. Nothing was connected.",
    error: "Something went wrong connecting Gmail. Please try again.",
    norefresh:
      "Google didn't return a refresh token. Remove MoneySense at myaccount.google.com/permissions, then connect again.",
    notconfigured:
      "Gmail import isn't configured on the server yet (missing Google client credentials).",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Auto-import from Gmail
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your Google account and MoneySense will read your bank
          transaction emails and turn them into transactions automatically — no
          phone app needed.
        </p>

        {notice && noticeText[notice] && (
          <Alert tone={notice === "connected" ? "success" : "warning"}>
            {noticeText[notice]}
          </Alert>
        )}

        {connected ? (
          <>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>
                  Connected{email ? ` as ` : ""}
                  {email && <b>{email}</b>}
                </span>
              </div>
              <Badge tone="success">Active</Badge>
            </div>

            {lastSync && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(lastSync).toLocaleString()}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={syncNow} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync now
              </Button>
              <form action={disconnectGmail}>
                <Button type="submit" variant="outline">
                  Disconnect
                </Button>
              </form>
            </div>

            {result && <Alert tone="info">{result}</Alert>}
            {error && <Alert tone="danger">{error}</Alert>}

            <Alert tone="info">
              Auto-sync runs daily. Use <b>Sync now</b> to pull immediately.
              Imported items are tagged <b>source: Email</b> and create a
              notification so you can review them. OTPs, promos and credits are
              ignored.
            </Alert>
          </>
        ) : (
          <a href="/api/gmail/connect">
            <Button>
              <Link2 className="h-4 w-4" /> Connect Gmail
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
