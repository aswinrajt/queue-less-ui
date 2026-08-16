# QueueLess — API Endpoints (Quick Reference)

> **Build the backend:** Use **[BACKEND-PROMPTS.md](./BACKEND-PROMPTS.md)** — ~18 MVP endpoints with copy-paste prompts.
>
> **Full schemas:** See **[BACKEND-ENDPOINTS.md](./BACKEND-ENDPOINTS.md)** only when you need detailed JSON examples.

**Base path:** `/api/v1`  
**Auth:** `Authorization: Bearer <token>` on protected routes unless noted.

---

## Authentication & account

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `POST` | `/auth/signup` | Register business and owner | `signup.tsx` |
| `POST` | `/auth/login` | Email / password login | `login.tsx` |
| `POST` | `/auth/logout` | End session | — |
| `POST` | `/auth/forgot-password` | Send password reset email | `forgot-password.tsx` |
| `POST` | `/auth/reset-password` | Set new password from token | — |
| `GET` | `/auth/me` | Current user and business context | Dashboard guard |
| `POST` | `/auth/refresh` | Refresh access token | — |
| `POST` | `/auth/accept-invite` | Staff accepts invite, sets password | `dashboard.staff.tsx` |

**Signup body (from UI):** `name`, `phone`, `businessName`, `businessType`, `email`, `password`

---

## Business / tenant

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `GET` | `/business` | Get business profile | `mock-data.business`, settings |
| `PATCH` | `/business` | Update name, phone, address, timezone | Settings → Profile |
| `DELETE` | `/business` | Delete business account | Settings → Danger zone |
| `POST` | `/business/close-all-queues` | Close every queue for the day | Settings → Danger zone |

---

## Business settings

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `GET` | `/business/public-page` | Public URL, welcome message, display toggles | Settings → Public page |
| `PATCH` | `/business/public-page` | Update public page config | Settings → Public page |
| `GET` | `/business/working-hours` | Weekly schedule | Settings → Hours |
| `PUT` | `/business/working-hours` | Save weekly schedule | Settings → Hours |
| `GET` | `/business/qr-code` | QR image or A4 poster PDF | Settings → QR |
| `GET` | `/business/billing` | Plan, usage, next charge date | Settings → Billing |
| `PATCH` | `/business/billing` | Billing email, GSTIN | Settings → Billing |
| `POST` | `/business/billing/change-plan` | Upgrade or downgrade plan | Settings → Billing |
| `GET` | `/business/billing/invoices` | List invoices | Settings → Billing |
| `GET` | `/business/billing/invoices/:invoiceId/download` | Download invoice PDF | Settings → Billing |

**Public page settings (from UI):**

- Show estimated wait time
- Show number of people waiting
- Show customer first names publicly

---

## Queues (business dashboard)

| Method | Endpoint | Purpose | Store action |
|--------|----------|---------|--------------|
| `GET` | `/queues` | List queues with live stats | `useQueueViews` |
| `POST` | `/queues` | Create queue | `createQueue` |
| `GET` | `/queues/:queueId` | Queue detail and live stats | `useQueueView` |
| `PATCH` | `/queues/:queueId` | Update queue config | `updateQueue` |
| `DELETE` | `/queues/:queueId` | Delete queue | `deleteQueue` |
| `PATCH` | `/queues/:queueId/status` | Set `active` / `paused` / `closed` | `setQueueStatus` |

**Create / update fields (from `QueueForm`):**

`name`, `location`, `description`, `avgServiceMinutes`, `capacity`, `tokenPrefix`, `openHours`, `staff[]`, `status`, plus customer-experience toggles (SMS at 2 ahead, WhatsApp, self-join QR, party size, priority tokens).

---

## Tickets / queue operations (staff)

| Method | Endpoint | Purpose | Store action |
|--------|----------|---------|--------------|
| `GET` | `/queues/:queueId/tickets` | All tickets (filter by status) | `useQueueTickets` |
| `POST` | `/queues/:queueId/tickets/call-next` | Call next waiting customer | `callNext` |
| `POST` | `/queues/:queueId/tickets/complete` | Complete current serving ticket | `completeCurrent` |
| `POST` | `/queues/:queueId/tickets/skip` | Skip current (no-show) | `skipCurrent` |
| `POST` | `/queues/:queueId/tickets/hold` | Put current ticket on hold | `holdCurrent` |
| `POST` | `/tickets/:ticketId/return-to-line` | Move held ticket back to waiting | `returnToLine` |
| `POST` | `/queues/:queueId/tickets/walk-in` | Staff-issued token at reception | `joinQueue` (Reception) |
| `GET` | `/tickets/:ticketId` | Single ticket detail | `useTicketView` |

---

## Public (customer-facing, no auth)

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `GET` | `/public/businesses/:businessSlug` | Business info for public pages | `/q/:slug` header |
| `GET` | `/public/queues/:slug` | Queue status: now serving, waiting count, ETA | `/q/:slug` |
| `POST` | `/public/queues/:slug/join` | Customer joins queue | `/q/:slug` join modal |
| `GET` | `/public/tokens/:token` | Token status: position, ETA, status | `/token/:tokenId` |
| `DELETE` | `/public/tokens/:token` | Customer leaves queue | Token page "Leave" |

**Join request body:**

```json
{
  "name": "Kavya Menon",
  "phone": "+91 98111 20345",
  "partySize": 1,
  "channel": "QR scan"
}
```

**Channel values:** `QR scan` | `Web link` | `Walk-in` | `Reception`

---

## Customers

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `GET` | `/customers` | List, search, and filter customers | `dashboard.customers.tsx` |
| `GET` | `/customers/:customerId` | Customer detail and visit history | Customer modal |
| `PATCH` | `/customers/:customerId` | Update tags, notes | — |
| `POST` | `/customers/:customerId/send-queue-link` | SMS queue link to customer | Customer modal |
| `POST` | `/customers/export` | Export CSV (async, emailed) | Export button |

**List query params:** `search`, `tab` (`all` | `regulars` | `risk`), `page`, `limit`

---

## Staff

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `GET` | `/staff` | List team members | `dashboard.staff.tsx` |
| `GET` | `/staff/stats` | On-duty count, served today, etc. | Staff stat cards |
| `POST` | `/staff/invites` | Invite by email and role | Invite modal |
| `PATCH` | `/staff/:staffId/role` | Change role | Staff dropdown |
| `PATCH` | `/staff/:staffId/queues` | Reassign queue assignments | Staff dropdown |
| `DELETE` | `/staff/:staffId` | Remove access | Staff dropdown |
| `PATCH` | `/staff/:staffId/status` | Set Active / Off duty | — |

**Roles:** `Owner` | `Manager` | `Counter staff`

---

## Notifications

| Method | Endpoint | Purpose | Store / UI |
|--------|----------|---------|------------|
| `GET` | `/notifications` | List alerts | `state.notifications` |
| `PATCH` | `/notifications/read-all` | Mark all as read | `markNotificationsRead` |
| `PATCH` | `/notifications/:notificationId/read` | Mark one as read | — |
| `GET` | `/notifications/preferences` | Customer and team notification prefs | Notifications sidebar |
| `PUT` | `/notifications/preferences` | Save preferences | Save preferences button |

**Customer preference toggles:**

- "You're getting close" at 2 ahead
- It's your turn — final call
- Delay warning when wait grows
- Feedback request after service

**Team preference toggles:**

- Wait time above target
- Repeated no-shows
- Daily summary email
- Staff sign-in activity

---

## Analytics & reporting

| Method | Endpoint | Purpose | UI source |
|--------|----------|---------|-----------|
| `GET` | `/analytics/overview` | Waiting, served, avg wait, peak hour | Dashboard, analytics |
| `GET` | `/analytics/hourly` | Joins vs served by hour | Analytics bar chart |
| `GET` | `/analytics/wait-trend` | Average wait by day | Analytics area chart |
| `GET` | `/analytics/channels` | Join channel breakdown (%) | Analytics pie chart |
| `GET` | `/analytics/queues` | Per-queue performance | Analytics table |
| `GET` | `/analytics/export` | Export report | — |

**Query params:** `range` (`24h` | `7d` | `30d`), optional `queueId`

---

## Real-time (recommended)

| Type | Endpoint | Purpose |
|------|----------|---------|
| WebSocket or SSE | `/realtime/queues/:queueId` | Live queue updates for staff |
| WebSocket or SSE | `/realtime/tokens/:token` | Live token updates for customers |
| WebSocket or SSE | `/realtime/business/:businessId` | Dashboard overview and notifications |

**Events to push:** ticket created / updated / removed, queue status changed, now-serving changed, notification created.

---

## Messaging (internal / backend service)

| Method | Endpoint | Purpose | UI reference |
|--------|----------|---------|--------------|
| `POST` | `/internal/sms/send` | Send SMS nudge | "2 people ahead", "It's your turn" |
| `POST` | `/internal/whatsapp/send` | WhatsApp status updates | Queue form toggle |
| `GET` | `/business/sms-credits` | Remaining SMS credits | Settings billing section |

---

## Store action → API mapping

| Current (`queue-store.tsx`) | Future API |
|-----------------------------|------------|
| `createQueue(draft)` | `POST /queues` |
| `updateQueue(id, draft)` | `PATCH /queues/:queueId` |
| `deleteQueue(id)` | `DELETE /queues/:queueId` |
| `setQueueStatus(id, status)` | `PATCH /queues/:queueId/status` |
| `callNext(queueId)` | `POST /queues/:queueId/tickets/call-next` |
| `completeCurrent(queueId)` | `POST /queues/:queueId/tickets/complete` |
| `skipCurrent(queueId)` | `POST /queues/:queueId/tickets/skip` |
| `holdCurrent(queueId)` | `POST /queues/:queueId/tickets/hold` |
| `returnToLine(ticketId)` | `POST /tickets/:ticketId/return-to-line` |
| `joinQueue({ queueId, … })` | `POST /public/queues/:slug/join` or `POST /queues/:queueId/tickets/walk-in` |
| `leaveQueue(ticketId)` | `DELETE /public/tokens/:token` |
| `markNotificationsRead()` | `PATCH /notifications/read-all` |

---

## Endpoint count summary

| Domain | Endpoints |
|--------|-----------|
| Auth | 8 |
| Business & settings | 14 |
| Queues (CRUD) | 6 |
| Tickets / operations | 8 |
| Public | 5 |
| Customers | 5 |
| Staff | 7 |
| Notifications | 5 |
| Analytics | 6 |
| Real-time | 3 channels |
| Messaging (internal) | 3 |
| **Total REST endpoints** | **~67** |
