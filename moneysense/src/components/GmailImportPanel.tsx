"use client";

import { useState } from "react";
import { disconnectGmail } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Badge } from "@/components/ui";
import { Mail, Loader2, RefreshCw, CheckCircle2, Plug } from "lucide-react";

export function GmailImportPanel({
  connected,
  email,
  lastSync,
  configured,
  notice,
}: {
  connected: boolean;
  email: string | null;
  lastSync: string | null;
  configured: boolean;
  notice?: string | null;
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setResult(data.error || "Sync failed.");
      else if (data.imported > 0)
        setResult(`Imported ${data.imported} new transaction${data.imported > 1 ? "s" : ""} from ${data.scanned} emails scanned.`);
      else setResult(`No new transactions found (${data.scanned} emails scanned).`);
    } catch {
      setResult("Network error.");
    } finally {
      setSyncing(false);
    }
  }

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
          transaction emails, extract each amount, merchant and category, and add
          them automatically (with a daily auto-sync).
        </p>

        {notice === "connected" && (
          <Alert tone="success">Gmail connected successfully.</Alert>
        )}
        {notice === "denied" && (
          <Alert tone="warning">You declined the Google permission. Nothing was connected.</Alert>
        )}
        {notice === "norefresh" && (
          <Alert tone="warning">
            Google didn&apos;t return a refresh token. Remove MoneySense from your
            Google account permissions, then connect again.
          </Alert>
        )}
        {notice === "notconfigured" && (
          <Alert tone="warning">
            Gmail import isn&apos;t configured on the server yet (missing Google
            credentials).
          </Alert>
        )}
        {notice === "error" && <Alert tone="danger">Something went wrong connecting Gmail.</Alert>}

        {!configured ? (
          <Alert tone="info">
            The server needs <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> set to enable this. See the README.
          </Alert>
        ) : connected ? (
          <>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">{email || "Gmail connected"}</p>
                  {lastSync && (
                    <p className="text-xs text-muted-foreground">
                      Last synced {new Date(lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <Badge tone="success">Connected</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={syncNow} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync now
              </Button>
              <form action={disconnectGmail}>
                <Button type="submit" variant="outline">
                  Disconnect
                </Button>
              </form>
            </div>

            {result && <Alert tone="info">{result}</Alert>}
          </>
        ) : (
          <a href="/api/gmail/connect">
            <Button>
              <Plug className="h-4 w-4" /> Connect Gmail
            </Button>
          </a>
        )}

        <Alert tone="info">
          MoneySense requests <b>read-only</b> access and only looks at bank
          transaction emails. Imported items are tagged <b>source: Email</b> and
          create a notification so you can review them. You can disconnect anytime.
        </Alert>
      </CardContent>
    </Card>
  );
}
