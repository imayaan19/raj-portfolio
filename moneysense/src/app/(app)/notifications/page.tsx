import { getNotifications } from "@/lib/data";
import { markAllNotificationsRead, deleteNotification } from "@/lib/actions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, Button, Badge, EmptyState } from "@/components/ui";
import { Bell, Check, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<string, any> = {
  budget: "warning",
  cashflow: "warning",
  surplus: "success",
  goal: "info",
  spending: "danger",
  welcome: "success",
};

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Budget alerts, cash-flow warnings, goal updates and more."
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button variant="outline" size="sm">
                <Check className="h-4 w-4" /> Mark all read
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up. Alerts about budgets, cash flow and goals will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? "" : "border-primary/40 bg-accent/40"}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge tone={TYPE_TONE[n.type] || "muted"}>{n.type}</Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {n.message && (
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <form action={deleteNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="p-1 text-muted-foreground hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
