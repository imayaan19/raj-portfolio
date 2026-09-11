import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileTopBar, BottomNav } from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) redirect("/onboarding");

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  const userName = profile?.name || user.email?.split("@")[0] || "there";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={userName} unread={count || 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar unread={count || 0} />
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
