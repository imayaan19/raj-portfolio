"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button, Input, Label, Alert } from "@/components/ui";
import { Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // The reset link arrives with a `?code=` (PKCE) or a `#access_token=…` hash.
  // Exchange it for a session before allowing the password update.
  useEffect(() => {
    async function establishSession() {
      try {
        // Already signed in (e.g. hash flow auto-detected)?
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          return;
        }
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setError(
              "This reset link has expired or was already used. Please request a new one."
            );
          } else {
            setReady(true);
          }
        } else {
          setError(
            "This reset link is invalid. Please request a new password reset."
          );
        }
      } catch {
        setError("Could not verify the reset link. Please request a new one.");
      }
    }
    establishSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password for your account."
    >
      <form onSubmit={handleUpdate} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        {!ready && !error && (
          <Alert tone="info">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying your reset
              link…
            </span>
          </Alert>
        )}
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={!ready}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !ready}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
