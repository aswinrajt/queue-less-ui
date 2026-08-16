import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { QueueDraft, QueueView } from "@/lib/queue-store";
import type { QueueStatus } from "@/lib/mock-data";

export function formatJoined(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function useApiQueues() {
  return useQuery({
    queryKey: ["queues"],
    queryFn: () => api.listQueues(),
  });
}

export function useApiQueue(queueId: string | undefined) {
  return useQuery({
    queryKey: ["queues", queueId],
    queryFn: () => api.getQueue(queueId!),
    enabled: Boolean(queueId),
  });
}

export function useApiTickets(queueId: string | undefined, live = false) {
  return useQuery({
    queryKey: ["tickets", queueId],
    queryFn: () => api.getTickets(queueId!),
    enabled: Boolean(queueId),
    refetchInterval: live ? false : 10_000,
  });
}

export function useQueueMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["queues"] });
    void queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  return {
    createQueue: useMutation({
      mutationFn: (draft: QueueDraft) => api.createQueue(draft),
      onSuccess: invalidate,
    }),
    updateQueue: useMutation({
      mutationFn: ({ id, draft }: { id: string; draft: Partial<QueueDraft> & { status?: QueueStatus } }) =>
        api.updateQueue(id, draft),
      onSuccess: invalidate,
    }),
    deleteQueue: useMutation({
      mutationFn: (id: string) => api.deleteQueue(id),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: QueueStatus }) => api.updateQueue(id, { status }),
      onSuccess: invalidate,
    }),
    ticketAction: useMutation({
      mutationFn: ({
        queueId,
        action,
        ticketId,
      }: {
        queueId: string;
        action: string;
        ticketId?: string;
      }) => api.ticketAction(queueId, action, ticketId),
      onSuccess: invalidate,
    }),
  };
}

export function useApiCustomers(search: string, tab: "all" | "regulars" | "risk") {
  return useQuery({
    queryKey: ["customers", search, tab],
    queryFn: () => api.listCustomers({ search, tab, limit: 50 }),
  });
}

export function useApiStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => api.listStaff(),
  });
}

export function useApiNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.listNotifications(),
    refetchInterval: 20_000,
  });
}

export function useApiAnalytics(range: "24h" | "7d" | "30d") {
  return useQuery({
    queryKey: ["analytics", range],
    queryFn: () => api.getAnalytics(range),
  });
}

export function emptyTickets() {
  return { waiting: [], serving: null, held: [], closed: [] };
}

export function overviewFromQueues(queues: QueueView[]) {
  const waiting = queues.reduce((sum, q) => sum + q.waiting, 0);
  const served = queues.reduce((sum, q) => sum + q.servedToday, 0);
  const skipped = queues.reduce((sum, q) => sum + q.skippedToday, 0);
  const issued = queues.reduce((sum, q) => sum + q.issuedToday, 0);
  const avgWait =
    queues.length > 0
      ? Math.round(queues.reduce((sum, q) => sum + q.avgWaitMinutes, 0) / queues.length)
      : 0;
  const avgService =
    queues.length > 0
      ? Math.round(queues.reduce((sum, q) => sum + q.avgServiceMinutes, 0) / queues.length)
      : 0;
  return { waiting, served, skipped, issued, avgWaitMinutes: avgWait, avgServiceMinutes: avgService, peakHour: "—" };
}
