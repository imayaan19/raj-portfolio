"use client";

import { useState } from "react";
import { generateIngestToken } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Badge } from "@/components/ui";
import { Smartphone, Copy, Check, RefreshCw, Loader2 } from "lucide-react";

export function SmsImportPanel({
  token,
  appUrl,
}: {
  token: string | null;
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const base = (appUrl || "").replace(/\/$/, "");
  const endpoint = token ? `${base}/api/import/sms?token=${token}` : "";
  const isLocal = base.includes("localhost") || base.includes("127.0.0.1");

  async function copy() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Auto-import from SMS
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Forward your bank transaction SMS to your private webhook and MoneySense
          will parse the amount, merchant and category, and add it automatically.
        </p>

        {!token ? (
          <Button
            type="button"
            onClick={async () => {
              setLoading(true);
              await generateIngestToken();
              setLoading(false);
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate my webhook URL
          </Button>
        ) : (
          <>
            <div>
              <p className="mb-1 text-sm font-medium">Your private webhook URL</p>
              <div className="flex items-stretch gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs">
                  {endpoint}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="mt-2">
                <form
                  action={async () => {
                    setLoading(true);
                    await generateIngestToken();
                    setLoading(false);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Regenerate (invalidates the old URL)
                  </button>
                </form>
              </div>
            </div>

            {isLocal && (
              <Alert tone="warning" title="Your phone can't reach localhost">
                This URL points to <b>localhost</b>, which only works on this
                computer. For your phone to send SMS here, deploy the app (e.g. to
                Vercel) and set <code>NEXT_PUBLIC_APP_URL</code> to that address —
                then regenerate this URL.
              </Alert>
            )}

            <div className="rounded-xl border border-border p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                Set it up with MacroDroid (Android, free) <Badge tone="muted">~5 min</Badge>
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>Install <b>MacroDroid</b> from the Play Store.</li>
                <li>New Macro → <b>Trigger</b>: “SMS Received”. Optionally restrict to your bank's sender IDs (e.g. HDFCBK, ICICIB).</li>
                <li><b>Action</b>: “HTTP Request (POST)”. URL = the webhook URL above.</li>
                <li>Set Content-Type to <code>text/plain</code> and the body to the SMS variable <code>{"[sms_message]"}</code>.</li>
                <li>Save and enable the macro. Send yourself a test, or wait for the next bank SMS.</li>
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">
                Tasker works too — same idea (Event: Received Text → HTTP Request POST with <code>%SMSRB</code> as the body).
              </p>
            </div>

            <Alert tone="info">
              Imported transactions are tagged <b>source: SMS</b> and create a
              notification so you can review or edit them. OTPs, promos and credits
              are ignored automatically. Keep this URL secret — anyone with it can
              add transactions to your account (use “Regenerate” if it leaks).
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
