# QueueLess — Backend Endpoint Specification

> **Start here instead:** [BACKEND-PROMPTS.md](./BACKEND-PROMPTS.md) — lean copy-paste prompts, MVP vs full scope, and merged routes (~18 endpoints for v1, not 70).
>
> This file is the **detailed reference** (full schemas, every UI-derived route). Use it when you need exact JSON shapes; use BACKEND-PROMPTS.md to actually build the backend.

Complete API contract for implementing the QueueLess backend. Every endpoint below is derived from the frontend UI (`src/routes/`) and the mock state machine (`src/lib/queue-store.tsx`).

**Status:** Not implemented — this document is the implementation spec.

---

## Table of contents

1. [Conventions](#conventions)
2. [Shared types & enums](#shared-types--enums)
3. [Authentication](#authentication)
4. [Business & tenant](#business--tenant)
5. [Business settings](#business-settings)
6. [Queues](#queues)
7. [Tickets & queue operations](#tickets--queue-operations)
8. [Public (customer) API](#public-customer-api)
9. [Customers](#customers)
10. [Staff](#staff)
11. [Notifications](#notifications)
12. [Analytics](#analytics)
13. [Real-time channels](#real-time-channels)
14. [Messaging (internal)](#messaging-internal)
15. [Endpoint index](#endpoint-index)

---

## Conventions

### Base URL

```
https://api.queueless.app/api/v1
```

### Authentication

| Audience | Header |
|----------|--------|
| Business dashboard | `Authorization: Bearer <access_token>` |
| Public customer pages | None (optional session cookie for "my tickets") |
| Staff invite flow | One-time token in body or query |
| Internal messaging | Service-to-service secret header |

### Roles

| Role | Permissions |
|------|-------------|
| `Owner` | Full access including billing and delete business |
| `Manager` | Queues, tickets, customers, staff (no billing delete) |
| `Counter staff` | Assigned queues: call next, complete, skip, hold, walk-ins |

### Standard error response

```json
{
  "error": {
    "code": "QUEUE_CAPACITY_FULL",
    "message": "Today's token limit for this queue is full",
    "details": {}
  }
}
```

| HTTP | When |
|------|------|
| `400` | Validation failed |
| `401` | Missing or invalid token |
| `403` | Insufficient role |
| `404` | Resource not found |
| `409` | Conflict (duplicate name, invalid state transition) |
| `422` | Business rule violation (queue paused, nobody waiting) |
| `429` | Rate limited (public join / token lookup) |
| `500` | Server error |

### Pagination (list endpoints)

Query: `page` (default `1`), `limit` (default `20`, max `100`)

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 128,
    "totalPages": 7
  }
}
```

### Timestamps

All API timestamps are ISO 8601 UTC (`2026-08-16T05:12:00.000Z`). Display formatting (e.g. `"10:42 AM"`) is a frontend concern using the business timezone.

---

## Shared types & enums

### Enums

```typescript
type QueueStatus = "active" | "paused" | "closed";
type TicketStatus = "waiting" | "serving" | "served" | "skipped" | "held";
type JoinChannel = "QR scan" | "Walk-in" | "Web link" | "Reception";
type StaffRole = "Owner" | "Manager" | "Counter staff";
type StaffStatus = "Active" | "Invited" | "Off duty";
type NotificationKind = "queue" | "customer" | "system" | "staff";
type BusinessType = "Clinic / diagnostics" | "Salon / spa" | "Service centre" | "Restaurant" | "Tuition centre" | "Other";
type AnalyticsRange = "24h" | "7d" | "30d";
```

### Queue (base)

```json
{
  "id": "q_1",
  "businessId": "biz_abc",
  "slug": "general-consultation",
  "name": "General Consultation",
  "location": "Ground floor · Desk 1",
  "description": "Walk-in consultations.",
  "status": "active",
  "avgServiceMinutes": 8,
  "capacity": 120,
  "tokenPrefix": "A",
  "nextTokenNumber": 48,
  "openHours": "09:00 – 18:00",
  "staffIds": ["s_1", "s_2"],
  "settings": {
    "smsTwoAhead": true,
    "whatsappUpdates": true,
    "allowSelfJoin": true,
    "askPartySize": false,
    "priorityTokens": false
  },
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-08-16T05:00:00.000Z"
}
```

### QueueView (queue + live stats)

Extends `Queue` with computed fields returned by list/detail endpoints:

```json
{
  "waiting": 6,
  "held": 1,
  "nowServing": "A-042",
  "servedToday": 68,
  "skippedToday": 1,
  "issuedToday": 47,
  "avgWaitMinutes": 18,
  "capacityLeft": 73
}
```

**Computation rules:**

- `waiting` — count of tickets with `status: "waiting"`
- `held` — count with `status: "held"`
- `nowServing` — token string of ticket with `status: "serving"`, or `"—"`
- `servedToday` — count of `served` tickets today (+ optional daily baseline)
- `skippedToday` — count of `skipped` tickets today
- `issuedToday` — all non-cancelled tickets issued today
- `avgWaitMinutes` — average `waitedMinutes` of closed tickets today, or live average of waiting
- `capacityLeft` — `capacity - issuedToday`, min 0

### Ticket (base)

```json
{
  "id": "t_1",
  "queueId": "q_1",
  "token": "A-042",
  "name": "Kavya Menon",
  "phone": "+91 98111 20345",
  "partySize": 1,
  "joinedAt": "2026-08-16T05:12:00.000Z",
  "waitedMinutes": 9,
  "serviceMinutes": null,
  "status": "serving",
  "channel": "QR scan"
}
```

### TicketView (ticket + position)

```json
{
  "waitMinutes": 9,
  "peopleAhead": 0,
  "estimatedWait": 0
}
```

- `peopleAhead` — index in waiting list (0 if not waiting)
- `estimatedWait` — `peopleAhead * queue.avgServiceMinutes`

---

## Authentication

### `POST /auth/signup`

**Use:** Register a new business and owner account. Creates business tenant, owner user, and default notification preferences.

**Auth:** None

**Request body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | Owner full name, 2–100 chars |
| `phone` | string | yes | E.164 or local format |
| `businessName` | string | yes | 2–120 chars |
| `businessType` | BusinessType | yes | From enum |
| `email` | string | yes | Valid email, unique |
| `password` | string | yes | Min 8 chars |

```json
{
  "name": "Meera Nair",
  "phone": "+91 98450 11223",
  "businessName": "Riverside Family Clinic",
  "businessType": "Clinic / diagnostics",
  "email": "meera@riversideclinic.in",
  "password": "securepass123"
}
```

**Response `201`:**

```json
{
  "user": {
    "id": "u_1",
    "name": "Meera Nair",
    "email": "meera@riversideclinic.in",
    "role": "Owner"
  },
  "business": {
    "id": "biz_1",
    "name": "Riverside Family Clinic",
    "slug": "riverside-family-clinic",
    "plan": "Free",
    "timezone": "Asia/Kolkata"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

**Side effects:** Send verification email (optional). Create empty business settings.

**Errors:** `409` email already registered.

---

### `POST /auth/login`

**Use:** Authenticate business user and return tokens.

**Auth:** None

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |
| `rememberMe` | boolean | no — extends refresh token TTL |

**Response `200`:** Same shape as signup (`user`, `business`, `tokens`).

**Errors:** `401` invalid credentials.

---

### `POST /auth/logout`

**Use:** Invalidate refresh token / session.

**Auth:** Bearer token

**Request body:** `{ "refreshToken": "eyJ..." }` (optional if using cookie sessions)

**Response `204`:** No body.

---

### `POST /auth/forgot-password`

**Use:** Send password reset link to email if account exists.

**Auth:** None

**Request body:** `{ "email": "meera@riversideclinic.in" }`

**Response `200`:** Always success (no email enumeration):

```json
{ "message": "If an account exists, a reset link has been sent." }
```

**Side effects:** Email with link valid 30 minutes (`/reset-password?token=...`).

---

### `POST /auth/reset-password`

**Use:** Set new password using reset token from email.

**Auth:** None

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `token` | string | yes |
| `password` | string | yes, min 8 |

**Response `200`:** `{ "message": "Password updated." }`

**Errors:** `400` expired or invalid token.

---

### `GET /auth/me`

**Use:** Return current user, business, and permissions for dashboard bootstrap.

**Auth:** Bearer token

**Response `200`:**

```json
{
  "user": {
    "id": "u_1",
    "name": "Meera Nair",
    "email": "meera@riversideclinic.in",
    "role": "Owner"
  },
  "business": {
    "id": "biz_1",
    "name": "Riverside Family Clinic",
    "slug": "riverside-family-clinic",
    "plan": "Growth",
    "timezone": "Asia/Kolkata",
    "phone": "+91 98450 11223",
    "address": "12 Riverside Road, Bengaluru 560001"
  },
  "permissions": ["queues:write", "staff:write", "billing:read"]
}
```

---

### `POST /auth/refresh`

**Use:** Exchange refresh token for new access token.

**Auth:** None (refresh token in body)

**Request body:** `{ "refreshToken": "eyJ..." }`

**Response `200`:** `{ "accessToken": "...", "expiresIn": 3600 }`

---

### `POST /auth/accept-invite`

**Use:** Staff member accepts invite and sets password.

**Auth:** None

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `inviteToken` | string | yes |
| `password` | string | yes, min 8 |
| `name` | string | no — override invite name |

**Response `200`:** Same as login response.

**Side effects:** Staff status → `Active`. Notification to owner.

---

## Business & tenant

### `GET /business`

**Use:** Load business profile for settings and public pages.

**Auth:** Bearer — any role

**Response `200`:**

```json
{
  "id": "biz_1",
  "name": "Riverside Family Clinic",
  "slug": "riverside-family-clinic",
  "plan": "Growth",
  "timezone": "Asia/Kolkata",
  "phone": "+91 98450 11223",
  "address": "12 Riverside Road, Bengaluru 560001",
  "businessType": "Clinic / diagnostics",
  "createdAt": "2026-01-10T08:00:00.000Z"
}
```

---

### `PATCH /business`

**Use:** Update business profile from Settings → Profile.

**Auth:** Bearer — `Owner` or `Manager`

**Request body (all optional):**

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | 2–120 chars |
| `phone` | string | |
| `address` | string | max 500 |
| `timezone` | string | IANA timezone |

**Response `200`:** Updated business object.

---

### `DELETE /business`

**Use:** Permanently delete business, all queues, staff, and history.

**Auth:** Bearer — `Owner` only

**Request body:** `{ "confirmName": "Riverside Family Clinic" }` — must match business name

**Response `204`**

**Side effects:** Cancel subscription. Send confirmation email. Soft-delete with 30-day retention recommended.

---

### `POST /business/close-all-queues`

**Use:** Emergency close — set every queue to `closed`, release waiting customers.

**Auth:** Bearer — `Owner` or `Manager`

**Response `200`:**

```json
{
  "closedCount": 4,
  "releasedWaiting": 12
}
```

**Side effects:** Push realtime events. Create system notification.

---

## Business settings

### `GET /business/public-page`

**Use:** Load public queue page branding and display rules.

**Auth:** Bearer — any role

**Response `200`:**

```json
{
  "publicUrl": "https://queueless.app/q/riverside-family-clinic",
  "welcomeMessage": "Please join the queue from your phone.",
  "showEstimatedWait": true,
  "showWaitingCount": true,
  "showCustomerNames": false
}
```

---

### `PATCH /business/public-page`

**Use:** Save public page settings.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:** Any subset of GET fields except `publicUrl` (derived from slug).

**Response `200`:** Updated public page config.

---

### `GET /business/working-hours`

**Use:** Default weekly hours applied to new queues.

**Auth:** Bearer — any role

**Response `200`:**

```json
{
  "schedule": [
    { "day": "Monday", "open": "09:00", "close": "18:00", "isOpen": true },
    { "day": "Sunday", "open": "09:00", "close": "13:00", "isOpen": false }
  ]
}
```

---

### `PUT /business/working-hours`

**Use:** Replace full weekly schedule.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:** `{ "schedule": [ ... ] }` — exactly 7 days

**Response `200`:** Saved schedule.

---

### `GET /business/qr-code`

**Use:** Generate QR code or downloadable A4 poster for entrance.

**Auth:** Bearer — any role

**Query params:**

| Param | Values | Default |
|-------|--------|---------|
| `format` | `png`, `svg`, `pdf` | `png` |
| `queueSlug` | optional — queue-specific QR | business landing |

**Response `200`:** Binary file or `{ "downloadUrl": "https://..." }` for async PDF generation.

---

### `GET /business/billing`

**Use:** Current plan, usage, and next charge.

**Auth:** Bearer — `Owner` only

**Response `200`:**

```json
{
  "plan": "Growth",
  "priceMonthly": 149900,
  "currency": "INR",
  "nextChargeDate": "2026-09-01",
  "smsCredits": { "included": 2000, "used": 1241, "remaining": 759 },
  "staffSeats": { "included": 7, "used": 5, "remaining": 2 },
  "billingEmail": "accounts@riversideclinic.in",
  "gstin": "29ABCDE1234F1Z5"
}
```

---

### `PATCH /business/billing`

**Use:** Update billing contact details.

**Auth:** Bearer — `Owner` only

**Request body:** `{ "billingEmail": "...", "gstin": "..." }`

**Response `200`:** Updated billing info.

---

### `POST /business/billing/change-plan`

**Use:** Upgrade or downgrade subscription plan.

**Auth:** Bearer — `Owner` only

**Request body:** `{ "planId": "growth" }`

**Response `200`:** Updated billing object + proration summary.

---

### `GET /business/billing/invoices`

**Use:** List past invoices.

**Auth:** Bearer — `Owner` only

**Query:** `page`, `limit`

**Response `200`:** Paginated list of `{ id, date, amount, currency, status }`.

---

### `GET /business/billing/invoices/:invoiceId/download`

**Use:** Download invoice PDF.

**Auth:** Bearer — `Owner` only

**Response `200`:** `application/pdf` binary.

---

### `GET /business/sms-credits`

**Use:** Quick SMS credit balance for dashboard widgets.

**Auth:** Bearer — any role

**Response `200`:** `{ "included": 2000, "used": 1241, "remaining": 759 }`

---

## Queues

### `GET /queues`

**Use:** List all queues with live stats for dashboard queue list and overview.

**Auth:** Bearer — any role (counter staff sees assigned queues only)

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | QueueStatus | Filter by status |
| `search` | string | Filter by name |

**Response `200`:**

```json
{
  "data": [
    {
      "id": "q_1",
      "slug": "general-consultation",
      "name": "General Consultation",
      "status": "active",
      "waiting": 6,
      "nowServing": "A-042",
      "servedToday": 68,
      "avgWaitMinutes": 18,
      "capacityLeft": 73
    }
  ]
}
```

---

### `POST /queues`

**Use:** Create a new queue from dashboard → New queue.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | Unique per business |
| `location` | string | no | Default `"Main counter"` |
| `description` | string | no | |
| `avgServiceMinutes` | number | yes | Min 1 |
| `capacity` | number | yes | Min 1, daily token cap |
| `tokenPrefix` | string | no | Max 3 chars, default from name |
| `openHours` | string | no | e.g. `"09:00 – 18:00"` |
| `status` | QueueStatus | no | Default `active` |
| `staffIds` | string[] | no | Assigned staff member IDs |
| `settings` | object | no | SMS, WhatsApp, self-join toggles |

**Response `201`:** Full `Queue` + `QueueView` stats.

**Side effects:** Auto-generate `slug` from name. Set `nextTokenNumber: 1`. Create notification. Emit `queue.created`.

**Errors:** `409` duplicate queue name.

---

### `GET /queues/:queueId`

**Use:** Queue detail for live counter screen and edit form.

**Auth:** Bearer — role with access to this queue

**Response `200`:** `Queue` + `QueueView` fields.

**Errors:** `404`

---

### `PATCH /queues/:queueId`

**Use:** Update queue configuration from edit form.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:** Same fields as POST (partial update allowed). Cannot change `nextTokenNumber` directly.

**Response `200`:** Updated queue.

**Side effects:** Regenerate slug if name changes. Emit `queue.updated`.

---

### `DELETE /queues/:queueId`

**Use:** Delete queue and archive its tickets.

**Auth:** Bearer — `Owner` or `Manager`

**Response `204`**

**Side effects:** Remove all tickets for queue. Notification. Emit `queue.deleted`.

---

### `PATCH /queues/:queueId/status`

**Use:** Open, pause, or close a queue from queue cards or live screen.

**Auth:** Bearer — any role with queue access

**Request body:** `{ "status": "active" | "paused" | "closed" }`

**Response `200`:** Updated queue with stats.

**Business rules:**

| Status | Effect |
|--------|--------|
| `active` | Customers can join |
| `paused` | No new joins; existing line kept |
| `closed` | No joins; counter may finish serving |

**Side effects:** Notification. Emit `queue.status_changed`.

---

## Tickets & queue operations

### `GET /queues/:queueId/tickets`

**Use:** Load waiting list, serving ticket, held, and recently closed for live queue screen.

**Auth:** Bearer — queue access

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | TicketStatus | Filter (repeatable or comma-separated) |
| `limit` | number | For closed history, default 50 |

**Response `200`:**

```json
{
  "waiting": [ /* TicketView[] */ ],
  "serving": { /* TicketView | null */ },
  "held": [ /* TicketView[] */ ],
  "closed": [ /* TicketView[] */ ]
}
```

---

### `POST /queues/:queueId/tickets/call-next`

**Use:** Call the next waiting customer to the counter. Auto-completes current serving ticket if one exists.

**Auth:** Bearer — counter staff on this queue

**Request body:** `{}` (optional `{ "staffId": "s_2" }` for audit)

**Response `200`:**

```json
{
  "called": { /* TicketView — now serving */ },
  "closed": { /* TicketView | null — previous serving, now served */ }
}
```

**Business rules:**

- Fail `422` if nobody waiting
- If someone is serving, mark them `served` before calling next
- Append to end of queue order is FIFO by `joinedAt`

**Side effects:** SMS "It's your turn" if enabled. Notification. Emit `ticket.called`, `ticket.updated`.

---

### `POST /queues/:queueId/tickets/complete`

**Use:** Mark current serving customer as served without calling next.

**Auth:** Bearer — counter staff

**Response `200`:** Completed `TicketView` with `serviceMinutes` set.

**Errors:** `422` if no one is serving.

**Side effects:** Update customer visit stats. Emit `ticket.completed`.

---

### `POST /queues/:queueId/tickets/skip`

**Use:** Mark current serving customer as no-show / skipped.

**Auth:** Bearer — counter staff

**Response `200`:** Skipped ticket.

**Side effects:** Increment customer `noShows`. Emit `ticket.skipped`.

---

### `POST /queues/:queueId/tickets/hold`

**Use:** Park current serving customer (e.g. stepped away).

**Auth:** Bearer — counter staff

**Response `200`:** Ticket with `status: "held"`.

**Side effects:** Emit `ticket.held`.

---

### `POST /tickets/:ticketId/return-to-line`

**Use:** Move held ticket back to waiting list.

**Auth:** Bearer — counter staff

**Response `200`:** Ticket with `status: "waiting"` (appended to queue).

**Errors:** `422` if ticket is not `held`.

---

### `POST /queues/:queueId/tickets/walk-in`

**Use:** Reception adds customer manually from Customers page.

**Auth:** Bearer — any role with queue access

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `phone` | string | no |
| `partySize` | number | no, default 1 |

**Response `201`:** New `TicketView` with `channel: "Reception"`.

**Business rules:** Same as public join (queue must be `active`, under capacity).

**Side effects:** Upsert customer record. Emit `ticket.created`.

---

### `GET /tickets/:ticketId`

**Use:** Staff lookup of any ticket by ID.

**Auth:** Bearer — business scoped

**Response `200`:** `TicketView`

**Note:** Public customers use `/public/tokens/:token` instead.

---

## Public (customer) API

No authentication required. Rate limit: 30 req/min/IP per route.

### `GET /public/businesses/:businessSlug`

**Use:** Business name and address on public queue and token pages.

**Auth:** None

**Response `200`:**

```json
{
  "name": "Riverside Family Clinic",
  "slug": "riverside-family-clinic",
  "address": "12 Riverside Road, Bengaluru 560001",
  "phone": "+91 98450 11223"
}
```

---

### `GET /public/queues/:slug`

**Use:** Public queue status page (`/q/:slug`) — now serving, wait count, join eligibility.

**Auth:** None

**Query:** `businessSlug` required if slug is not globally unique

**Response `200`:**

```json
{
  "queue": {
    "id": "q_1",
    "slug": "general-consultation",
    "name": "General Consultation",
    "location": "Ground floor · Desk 1",
    "description": "Walk-in consultations.",
    "status": "active",
    "openHours": "09:00 – 18:00",
    "nowServing": "A-042",
    "waitingCount": 6,
    "estimatedWaitMinutes": 48,
    "capacityLeft": 73,
    "canJoin": true
  },
  "business": {
    "name": "Riverside Family Clinic",
    "slug": "riverside-family-clinic"
  },
  "upcoming": [
    { "token": "A-043", "position": 1, "waitMinutes": 12 }
  ]
}
```

**Privacy:** Omit customer names from `upcoming` unless `showCustomerNames` is true.

---

### `POST /public/queues/:slug/join`

**Use:** Customer joins queue from public page modal.

**Auth:** None

**Request body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | Trimmed, 1–100 chars |
| `phone` | string | no | For SMS notifications |
| `partySize` | number | no | Min 1, default 1 |
| `channel` | JoinChannel | no | Default `"Web link"` or infer from referrer |

**Response `201`:**

```json
{
  "ticket": {
    "id": "t_99",
    "token": "A-048",
    "status": "waiting",
    "peopleAhead": 6,
    "estimatedWait": 48,
    "joinedAt": "2026-08-16T05:42:00.000Z"
  },
  "trackingUrl": "/token/A-048"
}
```

**Business rules:**

- Queue must be `active`
- `issuedToday < capacity`
- Assign token: `{prefix}-{nextTokenNumber}` zero-padded to 3 digits
- Increment `nextTokenNumber`

**Errors:**

| Code | Condition |
|------|-----------|
| `QUEUE_PAUSED` | status is paused |
| `QUEUE_CLOSED` | status is closed |
| `QUEUE_CAPACITY_FULL` | at daily cap |

**Side effects:** Upsert customer. SMS confirmation optional. Emit `ticket.created`.

---

### `GET /public/tokens/:token`

**Use:** Customer token status page (`/token/:tokenId`) — position, ETA, alerts.

**Auth:** None

**Response `200`:**

```json
{
  "ticket": {
    "id": "t_2",
    "token": "A-043",
    "name": "Arjun Rao",
    "status": "waiting",
    "joinedAt": "2026-08-16T05:47:00.000Z",
    "waitMinutes": 12,
    "peopleAhead": 2,
    "estimatedWait": 16,
    "partySize": 2,
    "channel": "Web link"
  },
  "queue": {
    "name": "General Consultation",
    "slug": "general-consultation",
    "location": "Ground floor · Desk 1",
    "nowServing": "A-042",
    "status": "active"
  },
  "business": {
    "name": "Riverside Family Clinic",
    "address": "12 Riverside Road, Bengaluru 560001"
  },
  "alerts": {
    "gettingClose": true,
    "isYourTurn": false
  }
}
```

**Alerts logic:**

- `gettingClose`: `status === "waiting" && peopleAhead <= 2`
- `isYourTurn`: `status === "serving"`

---

### `DELETE /public/tokens/:token`

**Use:** Customer voluntarily leaves queue.

**Auth:** None (optional: require phone verification for abuse prevention)

**Response `204`**

**Business rules:** Only `waiting` or `held` tickets can leave.

**Side effects:** Remove from queue order. Emit `ticket.removed`.

**Errors:** `422` if already served or skipped.

---

## Customers

### `GET /customers`

**Use:** Customer directory with search and segment tabs.

**Auth:** Bearer — any role

**Query params:**

| Param | Description |
|-------|-------------|
| `search` | Match name or phone |
| `tab` | `all` \| `regulars` (visits ≥ 5) \| `risk` (noShows ≥ 2) |
| `page`, `limit` | Pagination |

**Response `200`:** Paginated `Customer[]`:

```json
{
  "id": "c_1",
  "name": "Kavya Menon",
  "phone": "+91 98111 20345",
  "visits": 12,
  "lastVisit": "2026-08-16T05:12:00.000Z",
  "noShows": 0,
  "avgWait": 9,
  "tags": ["Regular"]
}
```

---

### `GET /customers/:customerId`

**Use:** Customer detail modal with visit history.

**Auth:** Bearer — any role

**Response `200`:**

```json
{
  "customer": { /* Customer */ },
  "recentTickets": [
    { "token": "A-042", "queueName": "General Consultation", "status": "served", "date": "2026-08-16" }
  ]
}
```

---

### `PATCH /customers/:customerId`

**Use:** Update customer tags or internal notes.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:** `{ "tags": ["Regular", "Priority"], "notes": "..." }`

**Response `200`:** Updated customer.

---

### `POST /customers/:customerId/send-queue-link`

**Use:** SMS active queue join link to customer.

**Auth:** Bearer — any role

**Request body:** `{ "queueId": "q_1" }` optional — defaults to first active queue

**Response `202`:** `{ "message": "SMS queued" }`

**Side effects:** Deduct SMS credit. Internal SMS send.

---

### `POST /customers/export`

**Use:** Export customer list as CSV (emailed asynchronously).

**Auth:** Bearer — `Owner` or `Manager`

**Request body:**

```json
{
  "format": "csv",
  "tab": "all",
  "email": "meera@riversideclinic.in"
}
```

**Response `202`:** `{ "jobId": "export_abc", "message": "Export will be emailed shortly." }`

---

## Staff

### `GET /staff`

**Use:** Team list for staff management page.

**Auth:** Bearer — `Owner` or `Manager`

**Response `200`:**

```json
{
  "data": [
    {
      "id": "s_1",
      "name": "Dr. Meera Nair",
      "email": "meera@riversideclinic.in",
      "role": "Owner",
      "status": "Active",
      "queueAssignments": ["All queues"],
      "servedToday": 34
    }
  ]
}
```

---

### `GET /staff/stats`

**Use:** Stat cards on staff page (on duty, served today, busiest counter).

**Auth:** Bearer — `Owner` or `Manager`

**Response `200`:**

```json
{
  "totalMembers": 5,
  "onDutyNow": 3,
  "servedToday": 125,
  "seatsRemaining": 2,
  "busiestCounter": { "queueName": "Lab Sample Collection", "staffName": "Anita K.", "served": 41 }
}
```

---

### `POST /staff/invites`

**Use:** Invite new team member by email.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `email` | string | yes |
| `role` | `"Manager"` \| `"Counter staff"` | yes |
| `queueIds` | string[] | no |

**Response `201`:**

```json
{
  "staff": { "id": "s_6", "status": "Invited", "..." },
  "inviteSent": true
}
```

**Side effects:** Email invite link. Notification. Enforce plan seat limit.

**Errors:** `409` email already on team. `422` seat limit reached.

---

### `PATCH /staff/:staffId/role`

**Use:** Change staff role from dropdown.

**Auth:** Bearer — `Owner` only

**Request body:** `{ "role": "Manager" }`

**Response `200`:** Updated staff member.

---

### `PATCH /staff/:staffId/queues`

**Use:** Reassign which queues a staff member can operate.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:** `{ "queueIds": ["q_1", "q_2"] }` or `{ "allQueues": true }`

**Response `200`:** Updated staff member.

---

### `PATCH /staff/:staffId/status`

**Use:** Mark staff off duty or back active.

**Auth:** Bearer — `Owner`, `Manager`, or self

**Request body:** `{ "status": "Active" | "Off duty" }`

**Response `200`:** Updated staff member.

---

### `DELETE /staff/:staffId`

**Use:** Revoke staff access immediately.

**Auth:** Bearer — `Owner` or `Manager`

**Response `204`**

**Business rules:** Cannot remove last `Owner`. Cannot remove self if sole owner.

**Side effects:** Invalidate staff sessions. Notification.

---

## Notifications

### `GET /notifications`

**Use:** In-app notification feed.

**Auth:** Bearer — any role

**Query:** `unreadOnly` (boolean), `page`, `limit`

**Response `200`:**

```json
{
  "data": [
    {
      "id": "n_1",
      "title": "Queue wait time above target",
      "body": "General Consultation average wait is 18 min.",
      "kind": "queue",
      "unread": true,
      "createdAt": "2026-08-16T05:38:00.000Z"
    }
  ],
  "unreadCount": 3
}
```

---

### `PATCH /notifications/read-all`

**Use:** Mark every notification as read.

**Auth:** Bearer — any role

**Response `200`:** `{ "markedCount": 3 }`

---

### `PATCH /notifications/:notificationId/read`

**Use:** Mark single notification read.

**Auth:** Bearer — any role

**Response `200`:** Updated notification.

---

### `GET /notifications/preferences`

**Use:** Load SMS/email preference toggles for customers and team.

**Auth:** Bearer — `Owner` or `Manager`

**Response `200`:**

```json
{
  "customer": {
    "closeWarningTwoAhead": true,
    "yourTurnFinalCall": true,
    "delayWarning": true,
    "feedbackAfterService": false
  },
  "team": {
    "waitAboveTarget": true,
    "repeatedNoShows": true,
    "dailySummaryEmail": true,
    "staffSignInActivity": false
  }
}
```

---

### `PUT /notifications/preferences`

**Use:** Save notification preferences.

**Auth:** Bearer — `Owner` or `Manager`

**Request body:** Same shape as GET (full replace).

**Response `200`:** Saved preferences.

---

## Analytics

All analytics endpoints accept:

| Query | Type | Default |
|-------|------|---------|
| `range` | `24h` \| `7d` \| `30d` | `7d` |
| `queueId` | string | all queues |
| `timezone` | IANA | business timezone |

**Auth:** Bearer — any role

---

### `GET /analytics/overview`

**Use:** Dashboard stat cards and analytics headline metrics.

**Response `200`:**

```json
{
  "served": 1245,
  "waiting": 6,
  "skipped": 3,
  "avgWaitMinutes": 14,
  "avgServiceMinutes": 8,
  "peakHour": "11:00 – 12:00",
  "peakHourJoins": 41,
  "selfJoinShare": 75,
  "issued": 232,
  "noShowRate": 4.2
}
```

---

### `GET /analytics/hourly`

**Use:** Bar chart — joins vs served by hour.

**Response `200`:**

```json
{
  "data": [
    { "hour": "9a", "joined": 18, "served": 14 },
    { "hour": "10a", "joined": 32, "served": 27 }
  ]
}
```

---

### `GET /analytics/wait-trend`

**Use:** Area chart — average wait by day.

**Response `200`:**

```json
{
  "data": [
    { "day": "Mon", "wait": 14 },
    { "day": "Tue", "wait": 12 }
  ]
}
```

---

### `GET /analytics/channels`

**Use:** Pie chart — how customers joined (%).

**Response `200`:**

```json
{
  "data": [
    { "channel": "QR scan", "value": 48 },
    { "channel": "Web link", "value": 27 }
  ]
}
```

---

### `GET /analytics/queues`

**Use:** Per-queue performance table.

**Response `200`:**

```json
{
  "data": [
    {
      "queueId": "q_1",
      "queueName": "General Consultation",
      "servedToday": 68,
      "waiting": 6,
      "avgWaitMinutes": 18,
      "efficiencyPercent": 92
    }
  ]
}
```

---

### `GET /analytics/export`

**Use:** Download analytics report.

**Auth:** Bearer — `Owner` or `Manager`

**Query:** `range`, `format` (`csv` | `pdf`)

**Response `200`:** File download or `202` with email job for large reports.

---

## Real-time channels

Use WebSocket or Server-Sent Events. Clients subscribe after initial REST load.

### `WS /realtime/queues/:queueId`

**Use:** Live updates for staff counter screen and dashboard queue widgets.

**Auth:** Bearer token in query or first message

**Subscribe message:**

```json
{ "action": "subscribe", "channel": "queue", "queueId": "q_1" }
```

**Events emitted:**

| Event | Payload | When |
|-------|---------|------|
| `ticket.created` | `TicketView` | Customer joins |
| `ticket.updated` | `TicketView` | Status change, position change |
| `ticket.removed` | `{ ticketId, token }` | Customer leaves |
| `queue.status_changed` | `{ queueId, status }` | Pause / open / close |
| `queue.stats_updated` | `QueueView` partial | Aggregates changed |

---

### `WS /realtime/tokens/:token`

**Use:** Live token page without polling.

**Auth:** None (token acts as capability URL)

**Events:** `ticket.updated`, `queue.stats_updated` (now serving, ETA)

---

### `WS /realtime/business/:businessId`

**Use:** Dashboard overview, notification bell, multi-queue stats.

**Auth:** Bearer — business user

**Events:** All queue/ticket events for business + `notification.created`

---

## Messaging (internal)

Called by backend workers, not the browser directly.

### `POST /internal/sms/send`

**Use:** Send transactional SMS (turn notification, 2 ahead, queue link).

**Auth:** Internal service key

**Request body:**

```json
{
  "businessId": "biz_1",
  "phone": "+91 98111 20345",
  "template": "TURN_NOTIFICATION",
  "variables": {
    "token": "A-043",
    "queueName": "General Consultation",
    "location": "Ground floor · Desk 1"
  }
}
```

**Templates:** `JOIN_CONFIRMATION`, `TWO_AHEAD`, `TURN_NOTIFICATION`, `DELAY_WARNING`, `QUEUE_LINK`, `FEEDBACK_REQUEST`

**Response `202`:** `{ "messageId": "msg_abc", "creditsUsed": 1 }`

---

### `POST /internal/whatsapp/send`

**Use:** Same as SMS via WhatsApp Business API when queue has `whatsappUpdates: true`.

**Auth:** Internal service key

**Request/response:** Same shape as SMS endpoint.

---

## Endpoint index

| # | Method | Path | Auth | Primary use |
|---|--------|------|------|-------------|
| 1 | POST | `/auth/signup` | Public | Register business |
| 2 | POST | `/auth/login` | Public | Sign in |
| 3 | POST | `/auth/logout` | User | Sign out |
| 4 | POST | `/auth/forgot-password` | Public | Request reset email |
| 5 | POST | `/auth/reset-password` | Public | Set new password |
| 6 | GET | `/auth/me` | User | Session bootstrap |
| 7 | POST | `/auth/refresh` | Public | Refresh access token |
| 8 | POST | `/auth/accept-invite` | Public | Staff onboarding |
| 9 | GET | `/business` | User | Get profile |
| 10 | PATCH | `/business` | Manager+ | Update profile |
| 11 | DELETE | `/business` | Owner | Delete account |
| 12 | POST | `/business/close-all-queues` | Manager+ | Emergency close |
| 13 | GET | `/business/public-page` | User | Public page settings |
| 14 | PATCH | `/business/public-page` | Manager+ | Save public page |
| 15 | GET | `/business/working-hours` | User | Get hours |
| 16 | PUT | `/business/working-hours` | Manager+ | Save hours |
| 17 | GET | `/business/qr-code` | User | QR / poster |
| 18 | GET | `/business/billing` | Owner | Plan & usage |
| 19 | PATCH | `/business/billing` | Owner | Billing contact |
| 20 | POST | `/business/billing/change-plan` | Owner | Change plan |
| 21 | GET | `/business/billing/invoices` | Owner | List invoices |
| 22 | GET | `/business/billing/invoices/:id/download` | Owner | Download PDF |
| 23 | GET | `/business/sms-credits` | User | SMS balance |
| 24 | GET | `/queues` | User | List queues |
| 25 | POST | `/queues` | Manager+ | Create queue |
| 26 | GET | `/queues/:queueId` | User | Queue detail |
| 27 | PATCH | `/queues/:queueId` | Manager+ | Update queue |
| 28 | DELETE | `/queues/:queueId` | Manager+ | Delete queue |
| 29 | PATCH | `/queues/:queueId/status` | Staff+ | Open/pause/close |
| 30 | GET | `/queues/:queueId/tickets` | Staff+ | Ticket lists |
| 31 | POST | `/queues/:queueId/tickets/call-next` | Staff+ | Call next |
| 32 | POST | `/queues/:queueId/tickets/complete` | Staff+ | Complete serving |
| 33 | POST | `/queues/:queueId/tickets/skip` | Staff+ | Skip no-show |
| 34 | POST | `/queues/:queueId/tickets/hold` | Staff+ | Hold ticket |
| 35 | POST | `/tickets/:ticketId/return-to-line` | Staff+ | Return from hold |
| 36 | POST | `/queues/:queueId/tickets/walk-in` | Staff+ | Reception join |
| 37 | GET | `/tickets/:ticketId` | User | Staff ticket lookup |
| 38 | GET | `/public/businesses/:slug` | Public | Business info |
| 39 | GET | `/public/queues/:slug` | Public | Queue status page |
| 40 | POST | `/public/queues/:slug/join` | Public | Customer join |
| 41 | GET | `/public/tokens/:token` | Public | Token status page |
| 42 | DELETE | `/public/tokens/:token` | Public | Leave queue |
| 43 | GET | `/customers` | User | Customer list |
| 44 | GET | `/customers/:id` | User | Customer detail |
| 45 | PATCH | `/customers/:id` | Manager+ | Update tags |
| 46 | POST | `/customers/:id/send-queue-link` | User | SMS link |
| 47 | POST | `/customers/export` | Manager+ | CSV export |
| 48 | GET | `/staff` | Manager+ | Staff list |
| 49 | GET | `/staff/stats` | Manager+ | Staff metrics |
| 50 | POST | `/staff/invites` | Manager+ | Invite member |
| 51 | PATCH | `/staff/:id/role` | Owner | Change role |
| 52 | PATCH | `/staff/:id/queues` | Manager+ | Assign queues |
| 53 | PATCH | `/staff/:id/status` | Manager+ | Duty status |
| 54 | DELETE | `/staff/:id` | Manager+ | Remove access |
| 55 | GET | `/notifications` | User | Alert feed |
| 56 | PATCH | `/notifications/read-all` | User | Mark all read |
| 57 | PATCH | `/notifications/:id/read` | User | Mark one read |
| 58 | GET | `/notifications/preferences` | Manager+ | Get prefs |
| 59 | PUT | `/notifications/preferences` | Manager+ | Save prefs |
| 60 | GET | `/analytics/overview` | User | Summary stats |
| 61 | GET | `/analytics/hourly` | User | Hourly chart |
| 62 | GET | `/analytics/wait-trend` | User | Wait trend chart |
| 63 | GET | `/analytics/channels` | User | Channel pie chart |
| 64 | GET | `/analytics/queues` | User | Per-queue stats |
| 65 | GET | `/analytics/export` | Manager+ | Export report |
| 66 | WS | `/realtime/queues/:queueId` | Staff+ | Live queue |
| 67 | WS | `/realtime/tokens/:token` | Public | Live token |
| 68 | WS | `/realtime/business/:id` | User | Live dashboard |
| 69 | POST | `/internal/sms/send` | Internal | Send SMS |
| 70 | POST | `/internal/whatsapp/send` | Internal | Send WhatsApp |

**Total: 70 endpoints** (65 REST + 3 WebSocket + 2 internal)

---

## Frontend mapping reference

| Frontend action | Endpoint |
|-----------------|----------|
| `createQueue` | `POST /queues` |
| `updateQueue` | `PATCH /queues/:queueId` |
| `deleteQueue` | `DELETE /queues/:queueId` |
| `setQueueStatus` | `PATCH /queues/:queueId/status` |
| `callNext` | `POST /queues/:queueId/tickets/call-next` |
| `completeCurrent` | `POST /queues/:queueId/tickets/complete` |
| `skipCurrent` | `POST /queues/:queueId/tickets/skip` |
| `holdCurrent` | `POST /queues/:queueId/tickets/hold` |
| `returnToLine` | `POST /tickets/:ticketId/return-to-line` |
| `joinQueue` (public) | `POST /public/queues/:slug/join` |
| `joinQueue` (walk-in) | `POST /queues/:queueId/tickets/walk-in` |
| `leaveQueue` | `DELETE /public/tokens/:token` |
| `markNotificationsRead` | `PATCH /notifications/read-all` |
