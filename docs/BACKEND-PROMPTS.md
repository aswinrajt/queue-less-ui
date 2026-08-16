# QueueLess — Backend Build Prompts

Copy-paste prompts for building the API. **You do not need 70 endpoints** — the full UI spec inflated the count by splitting every screen action into its own route.

## How many endpoints do you actually need?

| Tier | Count | Covers |
|------|-------|--------|
| **MVP** | **~18 REST** | Auth, queues, live counter, customer join/token — app works end-to-end |
| **Product** | **~30 REST** | + customers, staff, notifications, single analytics endpoint |
| **Full UI parity** | **~45 REST** | + billing, exports, granular settings, split analytics charts |
| **Original doc** | 70 | Every UI toast, export, and chart as its own route — overkill for v1 |

### What you can merge (recommended)

| Instead of | Use |
|------------|-----|
| `PATCH /queues/:id/status` | `PATCH /queues/:id` with `{ status }` |
| 5 ticket action routes (`call-next`, `complete`, `skip`, `hold`, `return`) | `POST /queues/:id/tickets/actions` with `{ action }` |
| `POST .../walk-in` + public join | Same join endpoint; staff sends `Authorization` header |
| `GET /staff/stats` | Include stats in `GET /staff` response |
| 4 analytics routes | `GET /analytics?range=7d` returns all chart data |
| `GET /business/public-page`, `/working-hours`, `/billing` | Nested objects on `GET/PATCH /business` |
| `PATCH /notifications/read-all` + `/:id/read` | `PATCH /notifications` with `{ readAll: true }` |
| 3 WebSocket channels | One `WS /realtime` with `{ subscribe: "queue" \| "token" \| "business" }` |
| Custom auth (8 routes) | **Supabase Auth / Clerk / Firebase** — skip most auth endpoints |

### MVP endpoint list (build these first)

```
POST   /auth/signup
POST   /auth/login
GET    /auth/me

GET    /business
PATCH  /business

GET    /queues
POST   /queues
GET    /queues/:queueId
PATCH  /queues/:queueId
DELETE /queues/:queueId

GET    /queues/:queueId/tickets
POST   /queues/:queueId/tickets/actions

GET    /public/queues/:slug
POST   /public/queues/:slug/join
GET    /public/tokens/:token
DELETE /public/tokens/:token
```

Optional for MVP live updates: `WS /realtime` or poll `GET /public/tokens/:token` every 10s.

---

## Global context (paste once at start of backend session)

```
Build a REST API for QueueLess — digital queue management SaaS.

Base: /api/v1
Auth: Bearer JWT on protected routes. Public routes for customer join/token pages.
Tenant: every business user belongs to one businessId; scope all queries by it.

Enums:
- QueueStatus: active | paused | closed
- TicketStatus: waiting | serving | served | skipped | held
- JoinChannel: QR scan | Walk-in | Web link | Reception

Error shape: { error: { code, message, details? } }
Use 422 for business rules (queue paused, nobody waiting, capacity full).

Core models:
- Queue: id, businessId, slug, name, location, description, status, avgServiceMinutes,
  capacity, tokenPrefix, nextTokenNumber, openHours, staffIds[], settings{}
- Ticket: id, queueId, token, name, phone, partySize, status, channel, joinedAt,
  waitedMinutes, serviceMinutes?
- Computed on read: waiting count, nowServing token, peopleAhead, estimatedWait
  (peopleAhead * avgServiceMinutes)

Token format: {prefix}-{number padded to 3}, e.g. A-042.
FIFO queue order by joinedAt.
```

---

## Phase 1 — MVP prompts

### 1. Auth — Sign up

```
POST /api/v1/auth/signup

Create business owner account. No auth required.

Body: name, phone, businessName, businessType, email, password (min 8).

On success (201):
- Create Business (slug from businessName, timezone default Asia/Kolkata, plan Free)
- Create User as Owner linked to business
- Return { user, business, tokens: { accessToken, refreshToken, expiresIn } }

Errors: 409 if email exists. Validate all required fields.
```

### 2. Auth — Login

```
POST /api/v1/auth/login

Body: email, password, rememberMe? (optional).

Return same shape as signup (200). 401 on bad credentials.
```

### 3. Auth — Current session

```
GET /api/v1/auth/me

Auth: Bearer token.

Return { user: { id, name, email, role }, business: { id, name, slug, plan, timezone, phone, address } }.
Used to bootstrap dashboard on load.
```

### 4. Business — Get & update

```
GET  /api/v1/business
PATCH /api/v1/business

Auth: any business user. PATCH requires Owner or Manager.

GET returns business profile.
PATCH accepts partial: name, phone, address, timezone.

Settings UI fields can live as nested JSON on business for MVP:
{ publicPage: { welcomeMessage, showEstimatedWait, showWaitingCount, showCustomerNames },
  workingHours: [{ day, open, close, isOpen }] }
```

### 5. Queues — List & create

```
GET  /api/v1/queues
POST /api/v1/queues

Auth: business user. Counter staff sees assigned queues only.

GET: optional query status, search. Return array with live stats per queue:
{ waiting, held, nowServing, servedToday, skippedToday, issuedToday, avgWaitMinutes, capacityLeft }

POST body: name (required), location, description, avgServiceMinutes, capacity,
tokenPrefix, openHours, status, staffIds[], settings { smsTwoAhead, whatsappUpdates, allowSelfJoin }

Auto-generate slug from name. nextTokenNumber starts at 1.
409 if duplicate queue name in business. 201 returns full queue + stats.
```

### 6. Queues — Detail, update, delete

```
GET    /api/v1/queues/:queueId
PATCH  /api/v1/queues/:queueId
DELETE /api/v1/queues/:queueId

Auth: user with access to queue. PATCH/DELETE: Owner or Manager.

PATCH: partial update including status (active/paused/closed) — no separate status route.
DELETE: remove queue and its tickets. 404 if not found or wrong business.
```

### 7. Tickets — List for counter screen

```
GET /api/v1/queues/:queueId/tickets

Auth: staff with queue access.

Return {
  waiting: TicketView[],
  serving: TicketView | null,
  held: TicketView[],
  closed: TicketView[]  // last 50 served/skipped, newest first
}

TicketView = ticket fields + waitMinutes, peopleAhead, estimatedWait.
Optional query: status filter.
```

### 8. Tickets — Staff actions (single route)

```
POST /api/v1/queues/:queueId/tickets/actions

Auth: counter staff on this queue.

Body: { action: "call-next" | "complete" | "skip" | "hold" | "return-to-line", ticketId? }

Rules:
- call-next: fail 422 if no one waiting. If someone serving, mark them served first.
  Set next waiting ticket to serving. Return { called, closed? }.
- complete: mark current serving as served, set serviceMinutes. 422 if none serving.
- skip: mark serving as skipped, increment customer noShows.
- hold: mark serving as held.
- return-to-line: ticketId required, ticket must be held → waiting (append to queue).

Emit events for realtime layer if present.
Trigger SMS on call-next if business settings allow (async, don't block response).
```

### 9. Public — Queue status page

```
GET /api/v1/public/queues/:slug

No auth. Rate limit 30/min/IP.

Query: businessSlug if slug not globally unique.

Return queue public view: name, location, description, status, openHours,
nowServing, waitingCount, estimatedWaitMinutes, capacityLeft, canJoin,
upcoming (next 4 tokens — hide names unless business.publicPage.showCustomerNames),
business { name, slug, address }.

canJoin = status active AND capacityLeft > 0.
```

### 10. Public — Join queue

```
POST /api/v1/public/queues/:slug/join

No auth. Same rate limit.

Body: name (required), phone?, partySize? (default 1), channel? (default Web link)

Rules:
- Queue must be active. 422 QUEUE_PAUSED / QUEUE_CLOSED / QUEUE_CAPACITY_FULL.
- Issue token from queue.tokenPrefix + nextTokenNumber, increment counter.
- Create ticket status waiting. Upsert customer by phone/name.
- Return 201 { ticket: TicketView, trackingUrl: "/token/A-048" }

Staff walk-in: same endpoint with Bearer token + channel "Reception" (or separate
header X-Staff-Action: walk-in scoped to authenticated user's business).
```

### 11. Public — Token status

```
GET /api/v1/public/tokens/:token

No auth. Lookup by token string (e.g. A-043) scoped to active business day.

Return { ticket: TicketView, queue: { name, slug, location, nowServing, status },
business: { name, address },
alerts: { gettingClose: peopleAhead <= 2 && waiting, isYourTurn: status === serving } }.

404 if token not found or expired/closed day.
```

### 12. Public — Leave queue

```
DELETE /api/v1/public/tokens/:token

No auth. Only allowed for waiting or held tickets.
204 on success. 422 if already served/skipped.
Remove ticket from queue order.
```

### 13. Realtime (optional for MVP)

```
WS /api/v1/realtime

Auth: Bearer for staff; token string in subscribe message for customers.

Client sends: { action: "subscribe", channel: "queue"|"token"|"business", id: "..." }

Push events: ticket.created, ticket.updated, ticket.removed, queue.status_changed,
queue.stats_updated, notification.created.

MVP alternative: skip WebSocket; frontend polls GET /public/tokens/:token every 10s.
```

---

## Phase 2 — Product prompts

Build after MVP works with the frontend.

### 14. Customers

```
GET /api/v1/customers?search=&tab=all|regulars|risk&page=&limit=

Auth: business user. Paginated list. tab regulars = visits>=5, risk = noShows>=2.

GET /api/v1/customers/:customerId — detail + recentTickets[].

PATCH /api/v1/customers/:id — { tags[], notes? } Manager+ only.

Customers auto-created on join; no separate create endpoint needed.
```

### 15. Staff

```
GET  /api/v1/staff
POST /api/v1/staff/invites
PATCH /api/v1/staff/:staffId
DELETE /api/v1/staff/:staffId

GET returns { data: StaffMember[], stats: { totalMembers, onDutyNow, servedToday, seatsRemaining } }.

POST invites: { name, email, role: Manager|Counter staff, queueIds? }.
Send email with accept link. Status Invited until accept.

PATCH: partial { role, queueIds, status: Active|Off duty } — split fields from multiple routes in full spec.

DELETE: revoke access. Cannot delete last Owner.
Accept invite: POST /auth/accept-invite { inviteToken, password } or handle via auth provider.
```

### 16. Notifications

```
GET   /api/v1/notifications?unreadOnly=&page=
PATCH /api/v1/notifications

GET: { data: NotificationItem[], unreadCount }.
kind: queue | customer | system | staff.

PATCH body: { readAll: true } OR { ids: ["n_1"] } to mark read.

Create notifications inside ticket/queue action handlers (server-side), not via public API.

GET/PUT /api/v1/notifications/preferences — customer + team SMS/email toggles. Manager+.
```

### 17. Analytics (single endpoint)

```
GET /api/v1/analytics?range=24h|7d|30d&queueId=

Auth: business user.

Return one JSON blob for all dashboard charts:
{
  overview: { served, waiting, skipped, avgWaitMinutes, avgServiceMinutes, peakHour,
              peakHourJoins, selfJoinShare, issued, noShowRate },
  hourly: [{ hour, joined, served }],
  waitTrend: [{ day, wait }],
  channels: [{ channel, value }],
  queues: [{ queueId, queueName, servedToday, waiting, avgWaitMinutes, efficiencyPercent }]
}

Do NOT split into 5 endpoints unless traffic requires it.
```

---

## Phase 3 — Full UI parity (only if needed)

Skip until users ask for these features.

| Prompt summary | Route | Skip if |
|----------------|-------|---------|
| Password reset flow | POST /auth/forgot-password, /reset-password | Auth provider handles it |
| Refresh token | POST /auth/refresh | Auth provider handles it |
| Delete business | DELETE /business | Manual admin for now |
| Close all queues | POST /business/close-all-queues | Loop PATCH queues in frontend |
| QR poster download | GET /business/qr-code?format=pdf | Generate QR client-side |
| Billing & invoices | GET/PATCH /business/billing, invoices | Stripe portal link only |
| Customer export CSV | POST /customers/export | Manual SQL export |
| Send queue link SMS | POST /customers/:id/send-queue-link | Part of notification service |
| Analytics export | GET /analytics/export | Copy dashboard data |
| Internal SMS/WhatsApp | POST /internal/sms/send | Use Twilio directly in action handlers |
| Separate staff PATCH routes | role / queues / status | One PATCH /staff/:id |

---

## Quick reference — prompt → route

| # | Paste prompt | Method | Path | Phase |
|---|--------------|--------|------|-------|
| 1 | Sign up | POST | `/auth/signup` | MVP |
| 2 | Login | POST | `/auth/login` | MVP |
| 3 | Current session | GET | `/auth/me` | MVP |
| 4 | Business profile | GET/PATCH | `/business` | MVP |
| 5 | List/create queues | GET/POST | `/queues` | MVP |
| 6 | Queue CRUD | GET/PATCH/DELETE | `/queues/:id` | MVP |
| 7 | Ticket lists | GET | `/queues/:id/tickets` | MVP |
| 8 | Ticket actions | POST | `/queues/:id/tickets/actions` | MVP |
| 9 | Public queue page | GET | `/public/queues/:slug` | MVP |
| 10 | Join queue | POST | `/public/queues/:slug/join` | MVP |
| 11 | Token status | GET | `/public/tokens/:token` | MVP |
| 12 | Leave queue | DELETE | `/public/tokens/:token` | MVP |
| 13 | Realtime | WS | `/realtime` | MVP optional |
| 14 | Customers | GET/PATCH | `/customers` | Phase 2 |
| 15 | Staff | GET/POST/PATCH/DELETE | `/staff` | Phase 2 |
| 16 | Notifications | GET/PATCH | `/notifications` | Phase 2 |
| 17 | Analytics | GET | `/analytics` | Phase 2 |

**MVP: 12 REST (+1 optional WS). Product: ~20 REST. Full spec doc: 70 — not required.**

---

## Using these prompts

1. Paste **Global context** into your backend chat or README.
2. Implement prompts **1–12** first — enough to replace `queue-store.tsx`.
3. Wire frontend: swap store calls for `fetch()` + React Query.
4. Add Phase 2 when dashboard pages need real data beyond queues.
5. See [BACKEND-ENDPOINTS.md](./BACKEND-ENDPOINTS.md) only when you need full request/response examples for a specific route.
