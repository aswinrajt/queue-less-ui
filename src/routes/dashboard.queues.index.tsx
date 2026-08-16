import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ListOrdered, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QueueCard } from "@/components/shared/queue-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useApiQueues } from "@/lib/api-hooks";
import type { QueueView } from "@/lib/queue-store";
import { QueueCardSkeleton } from "@/components/shared/queue-card";

export const Route = createFileRoute("/dashboard/queues/")({
  head: () => ({
    meta: [
      { title: "Queues — QueueLess" },
      { name: "description", content: "Create, pause and monitor every queue across your counters from one screen." },
      { property: "og:title", content: "Queue management — QueueLess" },
      { property: "og:description", content: "All your counters, tokens and service hours in one place." },
    ],
  }),
  component: QueuesPage,
});

function QueuesPage() {
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "closed">("all");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<QueueView | null>(null);
  const { data: queues = [], isLoading: loading, refetch } = useApiQueues();

  const visible = queues.filter(
    (q) =>
      (filter === "all" || q.status === filter) &&
      q.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <DashboardShell
      title="Queues"
      subtitle={`${queues.length} queue${queues.length === 1 ? "" : "s"} · ${
        queues.filter((q) => q.status === "active").length
      } live right now`}
    >
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Live</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search queues"
              className="pl-9"
            />
          </div>
          <Button asChild>
            <Link to="/dashboard/queues/new">
              <Plus className="h-4 w-4" /> New queue
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <QueueCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={ListOrdered}
          title="No queues match this view"
          description="Try a different status filter, or create a queue for this counter."
          action={
            <Button asChild>
              <Link to="/dashboard/queues/new">
                <Plus className="h-4 w-4" /> Create queue
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((q) => (
            <QueueCard
              key={q.id}
              queue={q}
              onStatusChange={async (queue, status) => {
                try {
                  await api.updateQueue(queue.id, { status });
                  await refetch();
                  toast.success(
                    status === "active"
                      ? `${queue.name} is live`
                      : status === "paused"
                        ? `${queue.name} paused`
                        : `${queue.name} closed`,
                    { description: "Customers see the new status instantly." },
                  );
                } catch (error) {
                  toast.error(error instanceof ApiError ? error.message : "Could not update queue");
                }
              }}
              onDelete={(queue) => setToDelete(queue)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={`Delete ${toDelete?.name ?? "queue"}?`}
        description="Waiting customers will be released and history archived. This can't be undone."
        confirmLabel="Delete queue"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await api.deleteQueue(toDelete.id);
            await refetch();
            toast.success("Queue deleted", { description: `${toDelete.name} was removed.` });
            setToDelete(null);
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not delete queue");
          }
        }}
      />
    </DashboardShell>
  );
}
