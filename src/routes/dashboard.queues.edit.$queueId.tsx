import { createFileRoute, useParams } from "@tanstack/react-router";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QueueForm } from "@/components/shared/queue-form";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useApiQueue } from "@/lib/api-hooks";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/queues/edit/$queueId")({
  head: () => ({
    meta: [
      { title: "Edit queue — QueueLess" },
      { name: "description", content: "Update queue hours, service time, staff assignment and customer notifications." },
      { property: "og:title", content: "Edit queue — QueueLess" },
      { property: "og:description", content: "Adjust how this counter queue behaves for staff and customers." },
    ],
  }),
  component: EditQueuePage,
});

function EditQueuePage() {
  const { queueId } = useParams({ from: "/dashboard/queues/edit/$queueId" });
  const { data: queue, isLoading } = useApiQueue(queueId);

  if (isLoading) {
    return (
      <DashboardShell title="Edit queue" subtitle="Loading">
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
          description="It was deleted or the link is out of date. Pick another queue to continue."
          action={
            <Button asChild>
              <Link to="/dashboard/queues">Back to queues</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={`Edit ${queue.name}`} subtitle={queue.location}>
      <QueueForm mode="edit" queue={queue} />
    </DashboardShell>
  );
}
