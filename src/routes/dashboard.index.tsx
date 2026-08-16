import { useCallback, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  ListOrdered,
  PhoneCall,
  Plus,
  SkipForward,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { emptyTickets, formatJoined, overviewFromQueues, useApiQueues, useApiTickets } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { useRealtime } from "@/lib/realtime";
import type { TicketView } from "@/lib/queue-store";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — QueueLess" },
      { name: "description", content: "Live overview of waiting customers, active queues, service pace and today's totals." },
      { property: "og:title", content: "QueueLess business dashboard" },
      { property: "og:description", content: "Track waiting customers, average wait and queue performance in real time." },
    ],
  }),
  component: DashboardOverview,
});

function DashboardOverview() {
  const [skipOpen, setSkipOpen] = useState(false);
  const { business } = useAuth();
  const { data: queues = [], refetch: refetchQueues } = useApiQueues();
  const analytics = overviewFromQueues(queues);
  const activeQueues = queues.filter((q) => q.status === "active");
  const focusQueue = activeQueues[0] ?? queues[0];
  const { data: tickets = emptyTickets(), refetch: refetchTickets } = useApiTickets(focusQueue?.id);
  const { waiting, serving } = tickets;
  const refreshLive = useCallback(() => {
    void Promise.all([refetchQueues(), refetchTickets()]);
  }, [refetchQueues, refetchTickets]);
  useRealtime("business", business?.id, refreshLive);
  const live = [...(serving ? [serving] : []), ...waiting];

  async function runTicketAction(action: string, success: string, description?: string) {
    if (!focusQueue) return;
    try {
      await api.ticketAction(focusQueue.id, action);
      await Promise.all([refetchQueues(), refetchTickets()]);
      toast.success(success, description ? { description } : undefined);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    }
  }

  return (
    <DashboardShell
      title={`Today at ${business?.name ?? "your business"}`}
      subtitle={`${business?.plan ?? "Free"} plan · ${queues.length} queues configured`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers waiting" value={analytics.waiting} icon={Users} trend={8} trendLabel="across every live queue" />
        <StatCard
          label="Currently serving"
          value={focusQueue?.nowServing ?? "—"}
          icon={PhoneCall}
          accent="info"
          trendLabel={focusQueue ? `${focusQueue.location} · ${focusQueue.name}` : "No queues yet"}
        />
        <StatCard label="Served today" value={analytics.served} icon={UserCheck} accent="success" trend={12} trendLabel="vs. yesterday" />
        <StatCard label="Average wait" value={analytics.avgWaitMinutes} unit="min" icon={Clock} accent="warning" trend={-6} trendLabel="target 12 min" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border bg-card shadow-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-5 py-4 sm:flex sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                {focusQueue ? `${focusQueue.name} queue` : "No queue selected"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {focusQueue
                  ? `${waiting.length} waiting · ${focusQueue.location}`
                  : "Create a queue to start serving customers"}
              </p>
            </div>
            {focusQueue && <StatusBadge tone={focusQueue.status} />}
          </div>

          <div className="flex flex-wrap gap-2 border-b bg-secondary/40 px-5 py-3">
            <Button
              disabled={!focusQueue}
              onClick={async () => {
                if (!focusQueue) return;
                try {
                  const result = (await api.ticketAction(focusQueue.id, "call-next")) as {
                    called?: TicketView;
                  };
                  await Promise.all([refetchQueues(), refetchTickets()]);
                  toast.success(`Called ${result.called?.token ?? "next"}`, {
                    description: `${result.called?.name ?? "Customer"} notified by SMS.`,
                  });
                } catch (error) {
                  toast.error(error instanceof ApiError ? error.message : "Action failed");
                }
              }}
            >
              <PhoneCall className="h-4 w-4" /> Call next
            </Button>
            <Button variant="outline" disabled={!serving} onClick={() => setSkipOpen(true)}>
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
            <Button
              variant="outline"
              disabled={!serving}
              onClick={() =>
                void runTicketAction(
                  "complete",
                  `${serving?.token ?? "Token"} completed`,
                  "Visit closed and stats updated.",
                )
              }
            >
              <CheckCircle2 className="h-4 w-4" /> Complete
            </Button>
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Token</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Wait</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="numeric font-bold">{t.token}</TableCell>
                    <TableCell>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.phone}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatJoined(t.joinedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.channel}</TableCell>
                    <TableCell className="numeric text-right">{t.waitMinutes}m</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge tone={t.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y md:hidden">
            {live.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="numeric shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-sm font-bold">
                    {t.token}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatJoined(t.joinedAt)} · {t.waitMinutes}m
                    </p>
                  </div>
                </div>
                <StatusBadge tone={t.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Active queues</h2>
              <Button asChild size="sm" variant="ghost">
                <Link to="/dashboard/queues">View all</Link>
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {activeQueues.map((q) => (
                <li key={q.id} className="rounded-xl border p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate text-sm font-medium">{q.name}</p>
                    <StatusBadge tone={q.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    <span className="numeric">Serving {q.nowServing}</span>
                    <span className="numeric">{q.waiting} waiting</span>
                    <span className="numeric">{q.avgWaitMinutes}m avg</span>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/dashboard/queues/new">
                <Plus className="h-4 w-4" /> Create queue
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="text-base font-semibold">Service pace</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Tokens issued today</span>
                <span className="numeric font-semibold">{analytics.issued}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">No-shows</span>
                <span className="numeric font-semibold">{analytics.skipped}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Busiest hour</span>
                <span className="numeric font-semibold">{analytics.peakHour}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg service time</span>
                <span className="numeric font-semibold">{analytics.avgServiceMinutes}m</span>
              </li>
            </ul>
            <Button asChild variant="ghost" className="mt-4 w-full justify-start px-0">
              <Link to="/dashboard/analytics">
                <ListOrdered className="h-4 w-4" /> Open analytics
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        title={`Skip token ${serving?.token ?? ""}?`}
        description={`${serving?.name ?? "This customer"} will be marked as a no-show.`}
        confirmLabel="Skip token"
        destructive
        onConfirm={() =>
          void runTicketAction("skip", `${serving?.token ?? "Token"} skipped`, "Marked as a no-show.")
        }
      />
    </DashboardShell>
  );
}
