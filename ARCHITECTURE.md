# QueueLess — Architecture

## Overview

QueueLess is a real-time digital queue management SaaS for clinics, salons, service centers, restaurants, tuition centers, and similar businesses. Customers join via QR code or web link and track their token; businesses manage live queues from a dashboard.

**Current phase:** Frontend-only prototype. All runtime data is held in a local React store backed by `localStorage`. There is no backend, authentication, or real-time server yet.

For the full backend implementation spec, see [docs/BACKEND-PROMPTS.md](./docs/BACKEND-PROMPTS.md) (recommended — MVP prompts) or [docs/BACKEND-ENDPOINTS.md](./docs/BACKEND-ENDPOINTS.md) (detailed reference).

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| SSR / app shell | TanStack Start (`@tanstack/react-start`) |
| Routing | TanStack Router (file-based, `src/routes/`) |
| Data fetching (wired, unused) | TanStack React Query |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| Forms | react-hook-form + Zod (where used) |
| Charts | Recharts |
| Build | Vite 8 + Nitro |
| Toasts | Sonner |

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  Public routes          │  Auth routes      │  Dashboard routes   │
│  /, /pricing, /q/:slug  │  /login, /signup  │  /dashboard/*       │
│  /token/:tokenId        │  /forgot-password │                     │
├─────────────────────────────────────────────────────────────────┤
│  UI components (layout/, shared/, ui/)                           │
├─────────────────────────────────────────────────────────────────┤
│  State layer (today)                                             │
│  QueueStoreProvider → queue-store.tsx + localStorage             │
│  (future) React Query → REST / WebSocket API client              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (planned)
┌─────────────────────────────────────────────────────────────────┐
│  Backend API (not implemented)                                   │
│  Auth · Businesses · Queues · Tickets · Customers · Staff ·      │
│  Analytics · Notifications · Billing · SMS / WhatsApp            │
└─────────────────────────────────────────────────────────────────┘
```

## Directory structure

```
src/
├── routes/                 # File-based pages (TanStack Router)
│   ├── __root.tsx          # App shell, QueueStoreProvider, QueryClient
│   ├── index.tsx           # Landing
│   ├── login.tsx, signup.tsx, forgot-password.tsx
│   ├── q.$slug.tsx         # Public join queue page
│   ├── token.$tokenId.tsx  # Customer token status page
│   ├── dashboard.tsx       # Dashboard layout (sidebar)
│   └── dashboard.*.tsx     # Dashboard sub-pages
├── components/
│   ├── layout/             # Shells: public, auth, dashboard
│   ├── shared/             # Domain components (queue-card, token-display, …)
│   └── ui/                 # shadcn primitives
├── lib/
│   ├── mock-data.ts        # Types + seed data
│   ├── queue-store.tsx     # Mock state machine (replace with API)
│   ├── utils.ts
│   └── error-*.ts          # SSR error handling
├── hooks/                  # use-mobile, use-mock-loading
├── router.tsx              # Router + QueryClient factory
├── start.ts                # TanStack Start middleware (CSRF, errors)
└── server.ts               # SSR entry wrapper
```

## Routing map

| Route | Purpose | Auth (future) |
|-------|---------|---------------|
| `/` | Landing | Public |
| `/pricing` | Pricing | Public |
| `/how-it-works` | Product info | Public |
| `/login`, `/signup`, `/forgot-password` | Business auth | Public |
| `/q/:slug` | Public queue join page | Public |
| `/token/:tokenId` | Customer token tracker | Public |
| `/dashboard` | Overview | Business |
| `/dashboard/queues` | Queue list | Business |
| `/dashboard/queues/new` | Create queue | Business |
| `/dashboard/queues/edit/:queueId` | Edit queue | Business |
| `/dashboard/queues/:queueId` | Live counter screen | Business |
| `/dashboard/customers` | Customer directory | Business |
| `/dashboard/analytics` | Reports & charts | Business |
| `/dashboard/notifications` | Alerts + preferences | Business |
| `/dashboard/staff` | Team management | Business |
| `/dashboard/settings` | Business profile, billing | Business |

## Domain model

Core types are defined in `src/lib/mock-data.ts`:

- **Business** — tenant (name, slug, timezone, plan, address)
- **Queue** — counter or service line (slug, status, capacity, token prefix, hours)
- **Ticket** — customer token in a queue (status lifecycle)
- **Customer** — aggregated visit history
- **StaffMember** — team with roles and queue assignments
- **NotificationItem** — in-app alerts

### Ticket status lifecycle

```
waiting → serving → served
                 ↘ skipped
                 ↘ held → waiting (return to line)

waiting / held → (leave) removed
```

### Queue status

`active` | `paused` | `closed`

## State management (current)

`QueueStoreProvider` in `__root.tsx` wraps the entire app and exposes mutations that mirror future API operations:

| Action | Used by |
|--------|---------|
| `createQueue`, `updateQueue`, `deleteQueue` | Queue form, queue list |
| `setQueueStatus` | Queue cards, live queue screen |
| `callNext`, `completeCurrent`, `skipCurrent`, `holdCurrent` | Dashboard overview, live queue |
| `returnToLine` | Live queue (held tickets) |
| `joinQueue`, `leaveQueue` | Public queue, token page, walk-ins |
| `markNotificationsRead` | Notifications page |

Derived hooks: `useQueueViews`, `useQueueTickets`, `useTicketView`, `useAnalytics`.

**Persistence:** `localStorage` key `queueless.mock-state.v1` with cross-tab sync via the `storage` event. A client-side clock ticks every minute so wait times grow realistically.

## Planned backend integration

1. Replace `queue-store` mutations with API calls and React Query caches.
2. Add JWT or session auth; protect `/dashboard/*` routes.
3. Add WebSocket or SSE for live queue and token updates.
4. Integrate SMS / WhatsApp for customer nudges.
5. Move analytics aggregation to server-side jobs.

## Real-time requirements

These screens need live updates once a backend exists:

- `/q/:slug` — now serving, wait count, estimated wait
- `/token/:tokenId` — position, people ahead, status changes
- `/dashboard/queues/:queueId` — waiting list, call next
- `/dashboard` — overview stats

## Security notes (for backend design)

- Scope public join endpoints by business slug and queue slug.
- Require business-scoped auth and role checks for dashboard mutations.
- Rate-limit public join and token lookup by IP and phone.
- CSRF middleware is already configured for TanStack Start server functions in `src/start.ts`.

## Deployment

- Built with Vite + Nitro.
- Scripts: `npm run dev`, `npm run build`, `npm run preview`.
- SSR handled via `src/server.ts` (error wrapper around TanStack Start server entry).

## Related docs

- [Backend build prompts](./docs/BACKEND-PROMPTS.md) — **recommended** — MVP endpoints, copy-paste prompts, what to skip
- [Backend endpoint specification](./docs/BACKEND-ENDPOINTS.md) — detailed schemas (70-route full UI parity)
- [API quick reference](./docs/API.md) — condensed endpoint list
