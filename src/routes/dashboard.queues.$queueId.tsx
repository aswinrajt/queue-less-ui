import { useCallback, useState } from "react";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  PhoneCall,
  PlayCircle,
  Settings2,
  SkipForward,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { TokenDisplay } from "@/components/shared/token-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { emptyTickets, formatJoined, useApiQueue, useApiTickets } from "@/lib/api-hooks";
import { useRealtime } from "@/lib/realtime";
import type { TicketView } from "@/lib/queue-store";

export const Route = createFileRoute("/dashboard/queues/$queueId")({
  head: () => ({
    meta: [
      { title: "Live queue screen — QueueLess" },
      { name: "description", content: "Counter view for calling the next token, skipping no-shows and completing visits." },
      { property: "og:title", content: "Live queue screen — QueueLess" },
      { property: "og:description", content: "One screen for your counter staff: call next, skip, complete." },
    ],
  }),
  component: LiveQueuePage,
});

function LiveQueuePage() {
  const { queueId } = useParams({ from: "/dashboard/queues/$queueId" });
  const { data: queue, isLoading, refetch: refetchQueue } = useApiQueue(queueId);
  const { data: tickets = emptyTickets(), refetch: refetchTickets } = useApiTickets(queueId);
  const { waiting, held, serving, closed } = tickets;
  const [skipOpen, setSkipOpen] = useState(false);
  const refresh = useCallback(() => {
    void Promise.all([refetchQueue(), refetchTickets()]);
  }, [refetchQueue, refetchTickets]);
  useRealtime("queue", queueId, refresh);

  async function runAction(action: string, ticketId?: string) {
    try {
      const result = await api.ticketAction(queueId, action, ticketId);
      await refresh();
      return result;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
      return null;
    }
  }

  if (isLoading) {
    return (
      <DashboardShell title="Live queue" subtitle="Loading">
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!queue) {
    return (
      <DashboardShell title="Queue not found" subtitle="It may have been deleted">
        <ErrorState
          title="This queue no longer exists"
          description="The queue was deleted or the link is out of date."
          action={
            <Button asChild>
              <Link to="/dashboard/queues">Back to queues</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const handleCallNext = async () => {
    const result = (await runAction("call-next")) as { called?: TicketView; closed?: TicketView } | null;
    if (!result?.called) return;
    toast.success(`Called ${result.called.token}`, {
      description: result.closed
        ? `${result.called.name} notified · ${result.closed.token} completed.`
        : `${result.called.name} notified by SMS.`,
    });
  };

  const handleComplete = async () => {
    const result = (await runAction("complete")) as TicketView | null;
    if (!result) return;
    toast.success(`${result.token} completed`, {
      description: `Visit closed in ${result.serviceMinutes ?? queue.avgServiceMinutes} minutes.`,
    });
  };

  const handleHold = async () => {
    const result = (await runAction("hold")) as TicketView | null;
    if (!result) return;
    toast(`${result.token} on hold`, { description: "Return them to the line when ready." });
  };

  const toggleStatus = async () => {
    const next = queue.status === "active" ? "paused" : "active";
    try {
      await api.updateQueue(queue.id, { status: next });
      await refresh();
      toast.success(next === "active" ? `${queue.name} resumed` : `${queue.name} paused`, {
        description: next === "active" ? "Customers can join again." : "New joins are blocked.",
      });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update status");
    }
  };

  return (
    <DashboardShell
      title={queue.name}
      subtitle={`${queue.location} · ${queue.openHours}`}
      actions={
        <>
          <StatusBadge tone={queue.status} />
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/queues/edit/$queueId" params={{ queueId: queue.id }}>
              <Settings2 className="h-4 w-4" /> Queue settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={toggleStatus}>
            {queue.status === "active" ? (
              <>
                <PauseCircle className="h-4 w-4" /> Pause queue
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" /> Open queue
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="space-y-4">
          <TokenDisplay token={queue.nowServing} caption="Now serving" size="xl" tone="ink" />

          {serving && (
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <p className="text-sm font-semibold">{serving.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{serving.phone}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span>Joined {formatJoined(serving.joinedAt)}</span>
                <span>Waited {serving.waitMinutes}m</span>
                <span>{serving.channel}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
              <Users className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="numeric mt-1.5 text-2xl font-bold">{queue.waiting}</p>
              <p className="text-[11px] text-muted-foreground">waiting</p>
            </div>
            <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
              <CheckCircle2 className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="numeric mt-1.5 text-2xl font-bold">{queue.servedToday}</p>
              <p className="text-[11px] text-muted-foreground">served</p>
            </div>
            <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
              <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="numeric mt-1.5 text-2xl font-bold">{queue.avgWaitMinutes}m</p>
              <p className="text-[11px] text-muted-foreground">avg wait</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button size="lg" className="sm:col-span-3" onClick={handleCallNext}>
              <PhoneCall className="h-4.5 w-4.5" /> Call next
            </Button>
            <Button variant="outline" onClick={() => setSkipOpen(true)} disabled={!serving}>
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
            <Button variant="outline" onClick={handleHold} disabled={!serving}>
              <PauseCircle className="h-4 w-4" /> Hold
            </Button>
            <Button variant="outline" onClick={handleComplete} disabled={!serving}>
              <CheckCircle2 className="h-4 w-4" /> Complete
            </Button>
          </div>

          {held.length > 0 && (
            <div className="rounded-2xl border bg-card shadow-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-semibold">On hold</h2>
              </div>
              <ul className="divide-y">
                {held.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="numeric shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-sm font-bold">
                        {t.token}
                      </span>
                      <p className="truncate text-sm">{t.name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const result = await runAction("return-to-line", t.id);
                        if (!result) return;
                        toast.success(`${t.token} back in line`);
                      }}
                    >
                      <Undo2 className="h-4 w-4" /> Return
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Waiting list</h2>
              <span className="numeric text-sm text-muted-foreground">{waiting.length} in line</span>
            </div>
            {waiting.length === 0 ? (
              <EmptyState
                className="m-4 border-0"
                icon={Users}
                title="Nobody is waiting"
                description="Share your QR code at the entrance so customers can join themselves."
                action={
                  <Button asChild variant="outline">
                    <Link to="/q/$slug" params={{ slug: queue.slug }}>
                      Open public page
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {waiting.map((t, i) => (
                  <li
                    key={t.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="numeric shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-sm font-bold">
                        {t.token}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatJoined(t.joinedAt)} · {t.channel}
                          {t.partySize > 1 ? ` · party of ${t.partySize}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="numeric text-xs text-muted-foreground">~{t.waitMinutes}m</span>
                      {i === 0 && <StatusBadge tone="waiting" label="Up next" dot={false} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card shadow-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">Recently closed</h2>
            </div>
            {closed.length === 0 ? (
              <EmptyState
                className="m-4 border-0"
                icon={CheckCircle2}
                title="No visits closed yet"
                description="Completed and skipped tokens will show up here."
              />
            ) : (
              <ul className="divide-y">
                {closed.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="numeric shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-sm font-bold">
                        {t.token}
                      </span>
                      <p className="truncate text-sm">{t.name}</p>
                    </div>
                    <StatusBadge tone={t.status} dot={false} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        title={`Skip token ${serving?.token ?? ""}?`}
        description="The customer is marked as a no-show and the next token can be called immediately."
        confirmLabel="Skip token"
        destructive
        onConfirm={async () => {
          const result = (await runAction("skip")) as TicketView | null;
          if (!result) return;
          toast(`${result.token} skipped`, { description: "Marked as a no-show." });
        }}
      />
    </DashboardShell>
  );
}
