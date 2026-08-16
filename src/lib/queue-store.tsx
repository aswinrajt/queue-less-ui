/**
 * Local mock state for the whole QueueLess app.
 *
 * Everything lives in React state (mirrored to localStorage so a reload and
 * a second browser tab stay in sync). There is no backend of any kind: the
 * business dashboard mutates this store and every customer-facing screen
 * reads from it, which is what makes token pages update "live".
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  channelSplit,
  historicTotals,
  seedCustomers,
  seedHourlyVolume,
  seedNotifications,
  seedQueues,
  seedTickets,
  seedWaitTrend,
  type Customer,
  type JoinChannel,
  type NotificationItem,
  type Queue,
  type QueueStatus,
  type Ticket,
} from "@/lib/mock-data";

/* ------------------------------------------------------------------ types */

export type QueueDraft = {
  name: string;
  location: string;
  description: string;
  avgServiceMinutes: number;
  capacity: number;
  status: QueueStatus;
  tokenPrefix: string;
  openHours: string;
  staff: string[];
};

/** A queue plus the counters derived from its tickets. */
export type QueueView = Queue & {
  waiting: number;
  held: number;
  nowServing: string;
  servedToday: number;
  skippedToday: number;
  issuedToday: number;
  avgWaitMinutes: number;
  capacityLeft: number;
};

export type TicketView = Ticket & {
  /** Minutes waited so far (keeps growing while still in line). */
  waitMinutes: number;
  peopleAhead: number;
  estimatedWait: number;
};

export type Analytics = {
  served: number;
  waiting: number;
  skipped: number;
  avgWaitMinutes: number;
  avgServiceMinutes: number;
  peakHour: string;
  peakHourJoins: number;
  hourly: { hour: string; joined: number; served: number }[];
  waitTrend: { day: string; wait: number }[];
  channels: { channel: string; value: number }[];
  selfJoinShare: number;
  issued: number;
  noShowRate: number;
};

type State = {
  queues: Queue[];
  tickets: Ticket[];
  customers: Customer[];
  notifications: NotificationItem[];
  hourly: { hour: string; joined: number; served: number }[];
  waitTrend: { day: string; wait: number }[];
  /** Ticket ids this browser created by joining a queue. */
  myTicketIds: string[];
  /** Minutes elapsed since the app booted — makes waits tick upwards. */
  clock: number;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/* ------------------------------------------------------------- seed / util */

const STORAGE_KEY = "queueless.mock-state.v1";

function seedState(): State {
  return {
    queues: seedQueues.map((q) => ({ ...q })),
    tickets: seedTickets.map((t) => ({ ...t })),
    customers: seedCustomers.map((c) => ({ ...c })),
    notifications: seedNotifications.map((n) => ({ ...n })),
    hourly: seedHourlyVolume.map((h) => ({ ...h })),
    waitTrend: seedWaitTrend.map((w) => ({ ...w })),
    myTicketIds: [],
    clock: 0,
  };
}

let idCounter = 0;
function uid(prefix: string) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}

function timeLabel(date = new Date()) {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\u202f/g, " ");
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "queue"
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function tokenFor(queue: Queue) {
  return `${queue.tokenPrefix}-${String(queue.nextTokenNumber).padStart(3, "0")}`;
}

const hourLabels: Record<string, string> = {
  "9a": "09:00 – 10:00",
  "10a": "10:00 – 11:00",
  "11a": "11:00 – 12:00",
  "12p": "12:00 – 13:00",
  "1p": "13:00 – 14:00",
  "2p": "14:00 – 15:00",
  "3p": "15:00 – 16:00",
  "4p": "16:00 – 17:00",
  "5p": "17:00 – 18:00",
};

/* ------------------------------------------------------------- selectors */

export function ticketWait(ticket: Ticket, clock: number) {
  const live = ticket.status === "waiting" || ticket.status === "held" || ticket.status === "serving";
  return ticket.waitedMinutes + (live ? clock : 0);
}

export function waitingTickets(state: State, queueId: string) {
  return state.tickets.filter((t) => t.queueId === queueId && t.status === "waiting");
}

export function servingTicket(state: State, queueId: string) {
  return state.tickets.find((t) => t.queueId === queueId && t.status === "serving");
}

export function estimateWait(peopleAhead: number, avgServiceMinutes: number) {
  return peopleAhead * avgServiceMinutes;
}

export function toQueueView(state: State, queue: Queue): QueueView {
  const mine = state.tickets.filter((t) => t.queueId === queue.id);
  const waiting = mine.filter((t) => t.status === "waiting");
  const held = mine.filter((t) => t.status === "held");
  const served = mine.filter((t) => t.status === "served");
  const skipped = mine.filter((t) => t.status === "skipped");
  const serving = mine.find((t) => t.status === "serving");
  const closedWaits = [...served, ...skipped].map((t) => t.waitedMinutes);

  return {
    ...queue,
    waiting: waiting.length,
    held: held.length,
    nowServing: serving?.token ?? "—",
    servedToday: queue.servedBaseline + served.length,
    skippedToday: skipped.length,
    issuedToday: mine.length,
    avgWaitMinutes:
      closedWaits.length > 0
        ? average(closedWaits)
        : average(waiting.map((t) => ticketWait(t, state.clock))) || queue.avgServiceMinutes,
    capacityLeft: Math.max(0, queue.capacity - mine.length),
  };
}

export function toTicketView(state: State, ticket: Ticket): TicketView {
  const queue = state.queues.find((q) => q.id === ticket.queueId);
  const line = waitingTickets(state, ticket.queueId);
  const index = line.findIndex((t) => t.id === ticket.id);
  const peopleAhead = ticket.status === "waiting" ? Math.max(0, index) : 0;
  return {
    ...ticket,
    waitMinutes: ticketWait(ticket, state.clock),
    peopleAhead,
    estimatedWait: estimateWait(peopleAhead, queue?.avgServiceMinutes ?? 5),
  };
}

export function computeAnalytics(state: State): Analytics {
  const served = state.tickets.filter((t) => t.status === "served");
  const skipped = state.tickets.filter((t) => t.status === "skipped");
  const waiting = state.tickets.filter((t) => t.status === "waiting");
  const closed = [...served, ...skipped];
  const peak = state.hourly.reduce(
    (best, row) => (row.joined > best.joined ? row : best),
    state.hourly[0] ?? { hour: "—", joined: 0, served: 0 },
  );
  const selfJoin = state.tickets.filter(
    (t) => t.channel === "QR scan" || t.channel === "Web link",
  ).length;

  return {
    served: state.queues.reduce((sum, q) => sum + q.servedBaseline, 0) + served.length,
    waiting: waiting.length,
    skipped: skipped.length,
    avgWaitMinutes:
      closed.length > 0
        ? average(closed.map((t) => t.waitedMinutes))
        : average(waiting.map((t) => ticketWait(t, state.clock))),
    avgServiceMinutes: average(
      served.map((t) => t.serviceMinutes).filter((m): m is number => typeof m === "number"),
    ),
    peakHour: hourLabels[peak.hour] ?? peak.hour,
    peakHourJoins: peak.joined,
    hourly: state.hourly,
    waitTrend: state.waitTrend,
    channels: channelSplit,
    selfJoinShare: state.tickets.length
      ? Math.round((selfJoin / state.tickets.length) * 100)
      : 0,
    issued: historicTotals.tokensIssuedToday + state.tickets.length,
    noShowRate: closed.length ? Math.round((skipped.length / closed.length) * 1000) / 10 : 0,
  };
}

/* ----------------------------------------------------------------- store */

type StoreValue = {
  state: State;
  hydrated: boolean;
  createQueue: (draft: QueueDraft) => ActionResult<Queue>;
  updateQueue: (id: string, draft: QueueDraft) => ActionResult<Queue>;
  deleteQueue: (id: string) => ActionResult<string>;
  setQueueStatus: (id: string, status: QueueStatus) => ActionResult<Queue>;
  callNext: (queueId: string) => ActionResult<{ called: Ticket; closed?: Ticket }>;
  completeCurrent: (queueId: string) => ActionResult<Ticket>;
  skipCurrent: (queueId: string) => ActionResult<Ticket>;
  holdCurrent: (queueId: string) => ActionResult<Ticket>;
  returnToLine: (ticketId: string) => ActionResult<Ticket>;
  joinQueue: (input: {
    queueId: string;
    name: string;
    phone?: string;
    partySize?: number;
    channel?: JoinChannel;
  }) => ActionResult<Ticket>;
  leaveQueue: (ticketId: string) => ActionResult<Ticket>;
  markNotificationsRead: () => void;
  resetDemo: () => void;
};

const QueueStoreContext = createContext<StoreValue | null>(null);

export function QueueStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const writingRef = useRef(false);

  /* hydrate from localStorage after mount (keeps SSR output stable) */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (Array.isArray(parsed.queues) && Array.isArray(parsed.tickets)) {
          setState({ ...seedState(), ...parsed, clock: 0 });
        }
      }
    } catch {
      /* corrupted or unavailable storage — keep the seed */
    }
    setHydrated(true);
  }, []);

  /* persist + broadcast to other tabs */
  useEffect(() => {
    if (!hydrated) return;
    try {
      writingRef.current = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    } finally {
      writingRef.current = false;
    }
  }, [state, hydrated]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue || writingRef.current) return;
      try {
        const parsed = JSON.parse(event.newValue) as State;
        setState((prev) => ({ ...parsed, clock: prev.clock }));
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* the clock makes waiting times tick up like a real queue */
  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => ({ ...prev, clock: prev.clock + 1 }));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const notify = useCallback(
    (state: State, item: Omit<NotificationItem, "id" | "time" | "unread">): State => ({
      ...state,
      notifications: [
        { ...item, id: uid("n"), time: "Just now", unread: true },
        ...state.notifications,
      ].slice(0, 40),
    }),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    /** Apply a pure transition against the freshest state. */
    function apply<T>(fn: (state: State) => ActionResult<T> & { next?: State }): ActionResult<T> {
      const result = fn(stateRef.current);
      if (result.ok && result.next) {
        const next = result.next;
        stateRef.current = next;
        setState(next);
      }
      return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
    }

    function closeServing(state: State, queueId: string, status: "served" | "skipped" | "held") {
      const current = servingTicket(state, queueId);
      if (!current) return { state, closed: undefined as Ticket | undefined };
      const closed: Ticket = {
        ...current,
        status,
        ...(status === "served"
          ? { serviceMinutes: Math.max(1, state.queues.find((q) => q.id === queueId)?.avgServiceMinutes ?? 5) }
          : {}),
      };
      return {
        state: {
          ...state,
          tickets: state.tickets.map((t) => (t.id === closed.id ? closed : t)),
        },
        closed,
      };
    }

    return {
      state,
      hydrated,

      createQueue: (draft) =>
        apply((s) => {
          if (!draft.name.trim()) return { ok: false as const, error: "Queue name is required" };
          if (s.queues.some((q) => q.name.toLowerCase() === draft.name.trim().toLowerCase())) {
            return { ok: false as const, error: "A queue with that name already exists" };
          }
          const queue: Queue = {
            id: uid("q"),
            slug: slugify(draft.name),
            name: draft.name.trim(),
            location: draft.location.trim() || "Main counter",
            description: draft.description.trim(),
            status: draft.status,
            avgServiceMinutes: Math.max(1, draft.avgServiceMinutes),
            capacity: Math.max(1, draft.capacity),
            tokenPrefix: (draft.tokenPrefix || draft.name[0] || "Q").toUpperCase().slice(0, 3),
            nextTokenNumber: 1,
            servedBaseline: 0,
            staff: draft.staff,
            openHours: draft.openHours,
          };
          return {
            ok: true as const,
            data: queue,
            next: notify({ ...s, queues: [...s.queues, queue] }, {
              title: `${queue.name} created`,
              body: `Tokens start at ${queue.tokenPrefix}-001 · ${queue.avgServiceMinutes} min average service.`,
              kind: "queue",
            }),
          };
        }),

      updateQueue: (id, draft) =>
        apply((s) => {
          const existing = s.queues.find((q) => q.id === id);
          if (!existing) return { ok: false as const, error: "Queue not found" };
          if (!draft.name.trim()) return { ok: false as const, error: "Queue name is required" };
          const updated: Queue = {
            ...existing,
            name: draft.name.trim(),
            slug: slugify(draft.name),
            location: draft.location.trim() || existing.location,
            description: draft.description,
            status: draft.status,
            avgServiceMinutes: Math.max(1, draft.avgServiceMinutes),
            capacity: Math.max(1, draft.capacity),
            tokenPrefix: (draft.tokenPrefix || existing.tokenPrefix).toUpperCase().slice(0, 3),
            openHours: draft.openHours,
            staff: draft.staff,
          };
          return {
            ok: true as const,
            data: updated,
            next: { ...s, queues: s.queues.map((q) => (q.id === id ? updated : q)) },
          };
        }),

      deleteQueue: (id) =>
        apply((s) => {
          const queue = s.queues.find((q) => q.id === id);
          if (!queue) return { ok: false as const, error: "Queue not found" };
          return {
            ok: true as const,
            data: queue.name,
            next: notify(
              {
                ...s,
                queues: s.queues.filter((q) => q.id !== id),
                tickets: s.tickets.filter((t) => t.queueId !== id),
              },
              {
                title: `${queue.name} deleted`,
                body: "Waiting customers were released and history archived.",
                kind: "queue",
              },
            ),
          };
        }),

      setQueueStatus: (id, status) =>
        apply((s) => {
          const queue = s.queues.find((q) => q.id === id);
          if (!queue) return { ok: false as const, error: "Queue not found" };
          const updated = { ...queue, status };
          return {
            ok: true as const,
            data: updated,
            next: notify({ ...s, queues: s.queues.map((q) => (q.id === id ? updated : q)) }, {
              title: `${queue.name} ${status === "active" ? "opened" : status}`,
              body:
                status === "active"
                  ? "Customers can join again from the public page."
                  : status === "paused"
                    ? "New joins are blocked, the current line is kept."
                    : "The queue is closed for the day.",
              kind: "queue",
            }),
          };
        }),

      callNext: (queueId) =>
        apply((s) => {
          const queue = s.queues.find((q) => q.id === queueId);
          if (!queue) return { ok: false as const, error: "Queue not found" };
          const line = waitingTickets(s, queueId);
          const next = line[0];
          if (!next) return { ok: false as const, error: "Nobody is waiting in this queue" };
          const afterClose = closeServing(s, queueId, "served");
          const called: Ticket = { ...next, status: "serving" };
          const withCall: State = {
            ...afterClose.state,
            tickets: afterClose.state.tickets.map((t) => (t.id === called.id ? called : t)),
          };
          return {
            ok: true as const,
            data: { called, ...(afterClose.closed ? { closed: afterClose.closed } : {}) },
            next: notify(withCall, {
              title: `${called.token} called`,
              body: `${called.name} was notified for ${queue.name}.`,
              kind: "customer",
            }),
          };
        }),

      completeCurrent: (queueId) =>
        apply((s) => {
          const current = servingTicket(s, queueId);
          if (!current) return { ok: false as const, error: "No customer is being served" };
          const result = closeServing(s, queueId, "served");
          return {
            ok: true as const,
            data: result.closed!,
            next: notify(result.state, {
              title: `${current.token} completed`,
              body: `${current.name} was served at ${timeLabel()}.`,
              kind: "customer",
            }),
          };
        }),

      skipCurrent: (queueId) =>
        apply((s) => {
          const current = servingTicket(s, queueId);
          if (!current) return { ok: false as const, error: "No customer is being served" };
          const result = closeServing(s, queueId, "skipped");
          return {
            ok: true as const,
            data: result.closed!,
            next: notify(result.state, {
              title: `${current.token} skipped`,
              body: `${current.name} did not respond and was marked as a no-show.`,
              kind: "customer",
            }),
          };
        }),

      holdCurrent: (queueId) =>
        apply((s) => {
          const current = servingTicket(s, queueId);
          if (!current) return { ok: false as const, error: "No customer is being served" };
          const result = closeServing(s, queueId, "held");
          return {
            ok: true as const,
            data: result.closed!,
            next: notify(result.state, {
              title: `${current.token} on hold`,
              body: `${current.name} is parked and can be returned to the line.`,
              kind: "customer",
            }),
          };
        }),

      returnToLine: (ticketId) =>
        apply((s) => {
          const ticket = s.tickets.find((t) => t.id === ticketId);
          if (!ticket) return { ok: false as const, error: "Token not found" };
          const updated: Ticket = { ...ticket, status: "waiting" };
          return {
            ok: true as const,
            data: updated,
            next: { ...s, tickets: s.tickets.map((t) => (t.id === ticketId ? updated : t)) },
          };
        }),

      joinQueue: ({ queueId, name, phone, partySize, channel }) =>
        apply((s) => {
          const queue = s.queues.find((q) => q.id === queueId);
          if (!queue) return { ok: false as const, error: "This queue no longer exists" };
          if (queue.status === "paused")
            return { ok: false as const, error: "This queue is paused — try again shortly" };
          if (queue.status === "closed")
            return { ok: false as const, error: "This queue is closed right now" };
          if (!name.trim()) return { ok: false as const, error: "Please enter your name" };
          const issued = s.tickets.filter((t) => t.queueId === queueId).length;
          if (issued >= queue.capacity)
            return { ok: false as const, error: "Today's token limit for this queue is full" };

          const ticket: Ticket = {
            id: uid("t"),
            queueId,
            token: tokenFor(queue),
            name: name.trim(),
            phone: phone?.trim() || "—",
            partySize: Math.max(1, partySize ?? 1),
            joinedAt: timeLabel(),
            waitedMinutes: 0,
            status: "waiting",
            channel: channel ?? "QR scan",
          };

          const existingCustomer = s.customers.find(
            (c) => c.name.toLowerCase() === ticket.name.toLowerCase(),
          );
          const customers = existingCustomer
            ? s.customers.map((c) =>
                c.id === existingCustomer.id
                  ? { ...c, visits: c.visits + 1, lastVisit: `Today, ${ticket.joinedAt}` }
                  : c,
              )
            : [
                {
                  id: uid("c"),
                  name: ticket.name,
                  phone: ticket.phone,
                  visits: 1,
                  lastVisit: `Today, ${ticket.joinedAt}`,
                  noShows: 0,
                  avgWait: queue.avgServiceMinutes,
                  tags: ["New"],
                } satisfies Customer,
                ...s.customers,
              ];

          return {
            ok: true as const,
            data: ticket,
            next: notify(
              {
                ...s,
                tickets: [...s.tickets, ticket],
                customers,
                queues: s.queues.map((q) =>
                  q.id === queueId ? { ...q, nextTokenNumber: q.nextTokenNumber + 1 } : q,
                ),
                myTicketIds: [ticket.id, ...s.myTicketIds],
              },
              {
                title: `${ticket.token} joined ${queue.name}`,
                body: `${ticket.name} joined by ${ticket.channel.toLowerCase()} at ${ticket.joinedAt}.`,
                kind: "customer",
              },
            ),
          };
        }),

      leaveQueue: (ticketId) =>
        apply((s) => {
          const ticket = s.tickets.find((t) => t.id === ticketId);
          if (!ticket) return { ok: false as const, error: "Token not found" };
          return {
            ok: true as const,
            data: ticket,
            next: {
              ...s,
              tickets: s.tickets.filter((t) => t.id !== ticketId),
              myTicketIds: s.myTicketIds.filter((id) => id !== ticketId),
            },
          };
        }),

      markNotificationsRead: () =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, unread: false })),
        })),

      resetDemo: () => {
        const fresh = seedState();
        stateRef.current = fresh;
        setState(fresh);
      },
    };
  }, [state, hydrated, notify]);

  return <QueueStoreContext.Provider value={value}>{children}</QueueStoreContext.Provider>;
}

export function useQueueStore() {
  const ctx = useContext(QueueStoreContext);
  if (!ctx) throw new Error("useQueueStore must be used inside <QueueStoreProvider>");
  return ctx;
}

/* ------------------------------------------------------- derived hooks */

export function useQueueViews(): QueueView[] {
  const { state } = useQueueStore();
  return useMemo(() => state.queues.map((q) => toQueueView(state, q)), [state]);
}

export function useQueueView(queueId: string | undefined): QueueView | undefined {
  const { state } = useQueueStore();
  return useMemo(() => {
    const queue = state.queues.find((q) => q.id === queueId);
    return queue ? toQueueView(state, queue) : undefined;
  }, [state, queueId]);
}

export function useQueueBySlug(slug: string): QueueView | undefined {
  const { state } = useQueueStore();
  return useMemo(() => {
    const queue = state.queues.find((q) => q.slug === slug);
    return queue ? toQueueView(state, queue) : undefined;
  }, [state, slug]);
}

export function useQueueTickets(queueId: string | undefined) {
  const { state } = useQueueStore();
  return useMemo(() => {
    const all = state.tickets
      .filter((t) => t.queueId === queueId)
      .map((t) => toTicketView(state, t));
    return {
      all,
      waiting: all.filter((t) => t.status === "waiting"),
      held: all.filter((t) => t.status === "held"),
      serving: all.find((t) => t.status === "serving"),
      closed: all.filter((t) => t.status === "served" || t.status === "skipped").reverse(),
    };
  }, [state, queueId]);
}

/** Look a ticket up by id or by token number (what the URL carries). */
export function useTicketView(tokenOrId: string): TicketView | undefined {
  const { state } = useQueueStore();
  return useMemo(() => {
    const ticket =
      state.tickets.find((t) => t.id === tokenOrId) ??
      state.tickets.find((t) => t.token.toLowerCase() === tokenOrId.toLowerCase());
    return ticket ? toTicketView(state, ticket) : undefined;
  }, [state, tokenOrId]);
}

export function useAnalytics(): Analytics {
  const { state } = useQueueStore();
  return useMemo(() => computeAnalytics(state), [state]);
}
