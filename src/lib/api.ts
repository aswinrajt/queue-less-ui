import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";
import type { QueueStatus } from "@/lib/mock-data";
import type { QueueDraft, QueueView, TicketView } from "@/lib/queue-store";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 401 && options.auth !== false && options.retry !== false) {
    try {
      await api.refresh();
      return request<T>(path, { ...options, retry: false });
    } catch {
      clearTokens();
    }
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };

  if (!res.ok) {
    throw new ApiError(res.status, data.error?.code ?? "ERROR", data.error?.message ?? res.statusText);
  }
  return data as T;
}

async function requestBlob(path: string) {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (res.status === 401) {
    await api.refresh();
    return requestBlob(path);
  }
  if (!res.ok) throw new ApiError(res.status, "ERROR", "Download failed");
  return res.blob();
}

export type AuthUser = { id: string; name: string; email: string; role: string };
export type AuthBusiness = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  timezone: string;
  phone?: string;
  address?: string;
  businessType?: string;
  publicPage?: {
    publicUrl?: string;
    welcomeMessage?: string;
    showEstimatedWait?: boolean;
    showWaitingCount?: boolean;
    showCustomerNames?: boolean;
  };
  workingHours?: { day: string; open: string; close: string; isOpen: boolean }[];
  smsIncluded?: number;
  smsUsed?: number;
};
export type AuthSession = {
  user: AuthUser;
  business: AuthBusiness;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
};

export type ApiQueue = QueueView & {
  staffIds?: string[];
  settings?: Record<string, boolean>;
};

function toQueueView(q: ApiQueue): QueueView {
  return {
    ...q,
    staff: q.staff ?? q.staffIds ?? [],
    servedBaseline: q.servedBaseline ?? q.servedToday ?? 0,
  };
}

export const api = {
  signup: (body: {
    name: string;
    phone: string;
    businessName: string;
    businessType: string;
    email: string;
    password: string;
  }) => request<AuthSession>("/auth/signup", { method: "POST", body, auth: false }),

  login: (body: { email: string; password: string; rememberMe?: boolean }) =>
    request<AuthSession>("/auth/login", { method: "POST", body, auth: false }),

  me: () => request<{ user: AuthUser; business: AuthBusiness; permissions: string[] }>("/auth/me"),

  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      await request<void>("/auth/logout", { method: "POST", body: { refreshToken } });
    } finally {
      clearTokens();
    }
  },

  refresh: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError(401, "UNAUTHORIZED", "No refresh token");
    const tokens = await request<{ accessToken: string; expiresIn: number; refreshToken?: string }>(
      "/auth/refresh",
      { method: "POST", body: { refreshToken }, auth: false },
    );
    setTokens(tokens.accessToken, tokens.refreshToken ?? refreshToken);
    return tokens;
  },

  getBusiness: () => request<AuthBusiness>("/business"),

  updateBusiness: (body: Partial<AuthBusiness> & { publicPage?: AuthBusiness["publicPage"]; workingHours?: AuthBusiness["workingHours"] }) =>
    request<AuthBusiness>("/business", { method: "PATCH", body }),

  listQueues: async (query?: { status?: QueueStatus; search?: string }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.search) params.set("search", query.search);
    const qs = params.toString();
    const result = await request<{ data: ApiQueue[] }>(`/queues${qs ? `?${qs}` : ""}`);
    return result.data.map(toQueueView);
  },

  createQueue: (draft: QueueDraft & { settings?: Record<string, boolean> }) =>
    request<ApiQueue>("/queues", {
      method: "POST",
      body: {
        name: draft.name,
        location: draft.location,
        description: draft.description,
        avgServiceMinutes: draft.avgServiceMinutes,
        capacity: draft.capacity,
        tokenPrefix: draft.tokenPrefix,
        openHours: draft.openHours,
        status: draft.status,
        staffIds: draft.staff,
        settings: draft.settings,
      },
    }).then(toQueueView),

  getQueue: (queueId: string) => request<ApiQueue>(`/queues/${queueId}`).then(toQueueView),

  updateQueue: (queueId: string, draft: Partial<QueueDraft> & { status?: QueueStatus; settings?: Record<string, boolean> }) =>
    request<ApiQueue>(`/queues/${queueId}`, {
      method: "PATCH",
      body: {
        ...draft,
        staffIds: draft.staff,
        settings: draft.settings,
      },
    }).then(toQueueView),

  deleteQueue: (queueId: string) => request<void>(`/queues/${queueId}`, { method: "DELETE" }),

  getTickets: (queueId: string) =>
    request<{
      waiting: TicketView[];
      serving: TicketView | null;
      held: TicketView[];
      closed: TicketView[];
    }>(`/queues/${queueId}/tickets`),

  ticketAction: (queueId: string, action: string, ticketId?: string) =>
    request<unknown>(`/queues/${queueId}/tickets/actions`, {
      method: "POST",
      body: { action, ticketId },
    }),

  walkIn: (queueId: string, body: { name: string; phone?: string; partySize?: number }) =>
    request<TicketView>(`/queues/${queueId}/tickets/walk-in`, { method: "POST", body }),

  getPublicQueue: (slug: string, businessSlug?: string) => {
    const qs = businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : "";
    return request<{
      queue: {
        id: string;
        slug: string;
        name: string;
        location: string;
        description: string;
        status: QueueStatus;
        openHours: string;
        avgServiceMinutes: number;
        nowServing: string;
        waitingCount: number;
        estimatedWaitMinutes: number;
        capacityLeft: number;
        canJoin: boolean;
      };
      business: { name: string; slug: string; address: string };
      upcoming: { token: string; position: number; waitMinutes: number; name?: string }[];
    }>(`/public/queues/${slug}${qs}`, { auth: false });
  },

  joinPublicQueue: (
    slug: string,
    body: { name: string; phone?: string; partySize?: number; channel?: string },
  ) =>
    request<{ ticket: TicketView; trackingUrl: string }>(`/public/queues/${slug}/join`, {
      method: "POST",
      body,
      auth: false,
    }),

  getPublicToken: (token: string) =>
    request<{
      ticket: TicketView;
      queue: { name: string; slug: string; location: string; nowServing: string; status: QueueStatus };
      business: { name: string; address: string };
      alerts: { gettingClose: boolean; isYourTurn: boolean };
    }>(`/public/tokens/${encodeURIComponent(token)}`, { auth: false }),

  leavePublicToken: (token: string) =>
    request<void>(`/public/tokens/${encodeURIComponent(token)}`, { method: "DELETE", auth: false }),

  listCustomers: (query?: { search?: string; tab?: "all" | "regulars" | "risk"; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.tab) params.set("tab", query.tab);
    if (query?.page) params.set("page", String(query.page));
    if (query?.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return request<{
      data: import("@/lib/mock-data").Customer[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/customers${qs ? `?${qs}` : ""}`);
  },

  getCustomer: (id: string) =>
    request<{
      customer: import("@/lib/mock-data").Customer;
      recentTickets: { token: string; queueName: string; status: string; date: string }[];
    }>(`/customers/${id}`),

  updateCustomer: (id: string, body: { tags?: string[]; notes?: string }) =>
    request<import("@/lib/mock-data").Customer>(`/customers/${id}`, { method: "PATCH", body }),

  sendQueueLink: (id: string, queueId?: string) =>
    request<{ message: string }>(`/customers/${id}/send-queue-link`, { method: "POST", body: { queueId } }),

  exportCustomers: () => requestBlob("/customers/export"),

  listStaff: () =>
    request<{
      data: import("@/lib/mock-data").StaffMember[];
      stats: { totalMembers: number; onDutyNow: number; servedToday: number; seatsRemaining: number; busiestCounter: string | null };
    }>("/staff"),

  inviteStaff: (body: { name: string; email: string; role: "Manager" | "Counter staff"; queueIds?: string[] }) =>
    request<{ staff: import("@/lib/mock-data").StaffMember; inviteSent: boolean; acceptUrl?: string }>("/staff/invites", {
      method: "POST",
      body,
    }),

  updateStaff: (id: string, body: { role?: string; queueIds?: string[]; status?: string }) =>
    request<unknown>(`/staff/${id}`, { method: "PATCH", body }),

  deleteStaff: (id: string) => request<void>(`/staff/${id}`, { method: "DELETE" }),

  acceptInvite: (body: { inviteToken: string; password: string; name?: string }) =>
    request<AuthSession>("/auth/accept-invite", { method: "POST", body, auth: false }),

  forgotPassword: (email: string) =>
    request<{ message: string; resetUrl?: string }>("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: { token, password }, auth: false }),

  listNotifications: (query?: { unreadOnly?: boolean; page?: number }) => {
    const params = new URLSearchParams();
    if (query?.unreadOnly) params.set("unreadOnly", "true");
    if (query?.page) params.set("page", String(query.page));
    const qs = params.toString();
    return request<{
      data: { id: string; title: string; body: string; kind: string; unread: boolean; time: string }[];
      unreadCount: number;
    }>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  markNotifications: (body: { readAll?: boolean; ids?: string[] }) =>
    request<{ unreadCount: number }>("/notifications", { method: "PATCH", body }),

  getNotificationPreferences: () => request<Record<string, boolean>>("/notifications/preferences"),

  saveNotificationPreferences: (body: Record<string, boolean>) =>
    request<Record<string, boolean>>("/notifications/preferences", { method: "PUT", body }),

  getAnalytics: (range: "24h" | "7d" | "30d" = "7d", queueId?: string) => {
    const params = new URLSearchParams({ range });
    if (queueId) params.set("queueId", queueId);
    return request<{
      overview: { served: number; avgWaitMinutes: number; peakHour: string; peakHourJoins: number; selfJoinShare: number };
      hourly: { hour: string; joined: number; served: number }[];
      waitTrend: { day: string; wait: number }[];
      channels: { channel: string; value: number }[];
      queues: { id: string; name: string; servedToday: number; waiting: number; avgWaitMinutes: number }[];
    }>(`/analytics?${params.toString()}`);
  },

  exportAnalytics: (range: "24h" | "7d" | "30d" = "7d") => requestBlob(`/analytics/export?range=${range}`),

  closeAllQueues: () => request<{ closed: number }>("/business/close-all-queues", { method: "POST" }),

  deleteBusiness: (confirmName: string) => request<void>("/business", { method: "DELETE", body: { confirmName } }),

  getBilling: () => request<{ plan: string; smsIncluded: number; smsUsed: number }>("/billing"),

  createCheckout: () => request<{ url?: string; mock?: boolean }>("/billing/checkout", { method: "POST" }),

  createBillingPortal: () => request<{ url?: string }>("/billing/portal", { method: "POST" }),
};

export function realtimeUrl() {
  return API_URL.replace(/^http/, "ws") + "/realtime";
}

export function persistSession(session: AuthSession) {
  setTokens(session.tokens.accessToken, session.tokens.refreshToken);
}
