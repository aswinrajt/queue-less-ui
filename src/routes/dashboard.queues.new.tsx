import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QueueForm } from "@/components/shared/queue-form";

export const Route = createFileRoute("/dashboard/queues/new")({
  head: () => ({
    meta: [
      { title: "Create a queue — QueueLess" },
      { name: "description", content: "Set up a new digital queue: token prefix, service time, staff and customer notifications." },
      { property: "og:title", content: "Create a queue — QueueLess" },
      { property: "og:description", content: "Configure a new counter queue in a couple of minutes." },
    ],
  }),
  component: NewQueuePage,
});

function NewQueuePage() {
  return (
    <DashboardShell title="Create queue" subtitle="Live in about two minutes">
      <QueueForm mode="create" />
    </DashboardShell>
  );
}
