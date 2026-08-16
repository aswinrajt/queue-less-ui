import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, MessageSquare, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useApiNotifications } from "@/lib/api-hooks";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — QueueLess" },
      { name: "description", content: "Queue alerts, customer nudges and staff activity, plus notification preferences." },
      { property: "og:title", content: "Notifications — QueueLess" },
      { property: "og:description", content: "Stay ahead of long waits with queue and customer alerts." },
    ],
  }),
  component: NotificationsPage,
});

const icons = {
  queue: Bell,
  customer: MessageSquare,
  staff: Users,
  system: Settings2,
} as const;

const prefRows = [
  { id: "customerTwoAhead", group: "Customers", label: "“You're getting close” at 2 ahead" },
  { id: "customerYourTurn", group: "Customers", label: "It's your turn — final call" },
  { id: "customerDelay", group: "Customers", label: "Delay warning when wait grows" },
  { id: "customerFeedback", group: "Customers", label: "Feedback request after service" },
  { id: "teamWaitAboveTarget", group: "Your team", label: "Wait time above target" },
  { id: "teamNoShows", group: "Your team", label: "Repeated no-shows" },
  { id: "teamDailySummary", group: "Your team", label: "Daily summary email" },
  { id: "teamStaffSignIn", group: "Your team", label: "Staff sign-in activity" },
] as const;

function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();
  const { data } = useApiNotifications();
  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => api.getNotificationPreferences(),
  });
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const preferences = draft ?? prefs ?? {};
  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const visible = notifications.filter((n) => (tab === "unread" ? n.unread : true));

  return (
    <DashboardShell
      title="Notifications"
      subtitle={`${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`}
    >
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              disabled={unreadCount === 0}
              onClick={() => {
                void api
                  .markNotifications({ readAll: true })
                  .then(() => {
                    toast.success("All caught up");
                    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  })
                  .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not update"));
              }}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={BellOff}
              title="Nothing unread"
              description="New queue alerts will show up here as they happen."
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((n) => {
                const Icon = icons[(n.kind as keyof typeof icons) ?? "system"] ?? Bell;
                return (
                  <li
                    key={n.id}
                    className={`rounded-2xl border bg-card p-4 shadow-card ${
                      n.unread ? "border-primary/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <p className="truncate text-sm font-semibold">{n.title}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {new Date(n.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                      </div>
                      {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Notification preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose what your team and customers are alerted about.
          </p>

          <div className="mt-5 space-y-5">
            {["Customers", "Your team"].map((group) => (
              <div key={group} className={group === "Your team" ? "border-t pt-5" : ""}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                <div className="mt-3 space-y-3">
                  {prefRows
                    .filter((row) => row.group === group)
                    .map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-4">
                        <Label htmlFor={row.id} className="font-normal">
                          {row.label}
                        </Label>
                        <Switch
                          id={row.id}
                          checked={Boolean(preferences[row.id])}
                          onCheckedChange={(on) => setDraft({ ...preferences, [row.id]: on })}
                        />
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            className="mt-6 w-full"
            onClick={() => {
              void api
                .saveNotificationPreferences(preferences)
                .then((saved) => {
                  setDraft(saved);
                  toast.success("Preferences saved");
                })
                .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not save"));
            }}
          >
            Save preferences
          </Button>
        </section>
      </div>
    </DashboardShell>
  );
}
