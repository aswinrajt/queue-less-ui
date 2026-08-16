import { Link } from "@tanstack/react-router";
import { Clock, MapPin, MoreHorizontal, Users } from "lucide-react";
import type { QueueStatus } from "@/lib/mock-data";
import type { QueueView } from "@/lib/queue-store";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QueueCard({
  queue,
  onStatusChange,
  onDelete,
}: {
  queue: QueueView;
  onStatusChange?: (queue: QueueView, status: QueueStatus) => void;
  onDelete?: (queue: QueueView) => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-lift">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{queue.name}</h3>
            <StatusBadge
              tone={queue.status}
              {...(queue.status === "active" ? { label: "Open" } : {})}
            />
          </div>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {queue.location}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Queue actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/queues/$queueId" params={{ queueId: queue.id }}>
                Open live screen
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/queues/edit/$queueId" params={{ queueId: queue.id }}>
                Edit queue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {queue.status !== "active" && (
              <DropdownMenuItem onSelect={() => onStatusChange?.(queue, "active")}>
                Open queue
              </DropdownMenuItem>
            )}
            {queue.status !== "paused" && (
              <DropdownMenuItem onSelect={() => onStatusChange?.(queue, "paused")}>
                Pause queue
              </DropdownMenuItem>
            )}
            {queue.status !== "closed" && (
              <DropdownMenuItem onSelect={() => onStatusChange?.(queue, "closed")}>
                Close queue
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete?.(queue)}>
              Delete queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-secondary/60 p-3 text-center">
        <div>
          <p className="numeric text-xl font-bold">{queue.nowServing}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Serving
          </p>
        </div>
        <div className="border-x">
          <p className="numeric text-xl font-bold">{queue.waiting}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Waiting
          </p>
        </div>
        <div>
          <p className="numeric text-xl font-bold">{queue.avgWaitMinutes}m</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Avg wait
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {queue.avgServiceMinutes}m service · {queue.openHours}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {queue.issuedToday}/{queue.capacity} tokens
        </span>
      </div>

      <div className="mt-5 flex gap-2">
        <Button asChild className="flex-1">
          <Link to="/dashboard/queues/$queueId" params={{ queueId: queue.id }}>
            Live screen
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link to="/dashboard/queues/edit/$queueId" params={{ queueId: queue.id }}>
            Edit
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function QueueCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-5 h-20 animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 h-4 w-52 animate-pulse rounded bg-muted" />
      <div className="mt-5 flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
