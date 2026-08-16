import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock,
  LineChart,
  PhoneCall,
  QrCode,
  ShieldCheck,
  SkipForward,
  Users,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QueueLess — Stop waiting. Know your turn." },
      {
        name: "description",
        content:
          "QueueLess is a real-time digital queue for clinics, salons, service centres, restaurants and tuition centres. Customers join by QR and wait anywhere.",
      },
      { property: "og:title", content: "QueueLess — Stop waiting. Know your turn." },
      {
        property: "og:description",
        content: "Real-time digital queues with live tokens, wait estimates and SMS nudges. No app for your customers to install.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: QrCode,
    title: "Join by QR, no app",
    body: "A poster at your door is all it takes. Customers get a token in their browser in seconds.",
  },
  {
    icon: BellRing,
    title: "Honest wait estimates",
    body: "Estimates learn from your actual service time, so “20 minutes” means twenty minutes.",
  },
  {
    icon: PhoneCall,
    title: "One-tap counter flow",
    body: "Call next, skip a no-show, complete a visit. Staff never look up a paper list again.",
  },
  {
    icon: Users,
    title: "Multiple counters",
    body: "Run consultation, lab and billing queues side by side, each with its own token series.",
  },
  {
    icon: LineChart,
    title: "Demand you can plan for",
    body: "See peak hours, average waits and no-show patterns per queue and per staff member.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Public screens show tokens, never full names or phone numbers, unless you allow it.",
  },
];

const steps = [
  { label: "Create your queue", body: "Name it, set service time, publish." },
  { label: "Share the QR code", body: "At the entrance, counter or over WhatsApp." },
  { label: "Call next", body: "Customers arrive on time, waiting room stays calm." },
];

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-lift">
      <div className="flex items-center gap-2 border-b bg-secondary/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-3 truncate text-xs text-muted-foreground">
          queueless.app/dashboard · Riverside Family Clinic
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.3fr] sm:p-5">
        <div className="space-y-3">
          <div className="rounded-xl bg-ink p-4 text-ink-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Now serving
            </p>
            <p className="numeric mt-1 text-4xl font-bold text-primary">A-042</p>
            <p className="mt-1 text-xs text-ink-muted">Desk 1 · Dr. Meera Nair</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "14", l: "waiting" },
              { v: "227", l: "served" },
              { v: "11m", l: "avg wait" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border p-2.5 text-center">
                <p className="numeric text-base font-bold">{s.v}</p>
                <p className="text-[10px] text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <PhoneCall className="h-3.5 w-3.5" /> Call next
            </div>
            <div className="flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium">
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </div>
            <div className="col-span-2 flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </div>
          </div>
        </div>

        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-3.5 py-2.5">
            <p className="text-xs font-semibold">General Consultation</p>
            <StatusBadge tone="active" className="text-[10px]" />
          </div>
          <ul className="divide-y">
            {[
              { t: "A-043", n: "Arjun Rao", w: "12m", s: "Up next" },
              { t: "A-044", n: "Fatima Sheikh", w: "18m", s: "Waiting" },
              { t: "A-045", n: "Daniel Fernandes", w: "24m", s: "Waiting" },
              { t: "A-046", n: "Priya Iyer", w: "31m", s: "Waiting" },
              { t: "A-047", n: "Mohit Bansal", w: "37m", s: "Waiting" },
            ].map((r) => (
              <li key={r.t} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="numeric shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold">
                    {r.t}
                  </span>
                  <span className="truncate text-xs">{r.n}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="numeric">{r.w}</span>
                  <span className="hidden rounded-full bg-secondary px-2 py-0.5 sm:inline">{r.s}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 grid-fade opacity-70" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Live queues at 1,200+ counters
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                Stop waiting.
                <br />
                <span className="text-primary">Know your turn.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                QueueLess replaces paper tokens and crowded waiting rooms with a live digital queue.
                Your customers watch their turn approach from their own phone — and you see the whole
                line on one screen.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="text-base">
                  <Link to="/signup">
                    Create your queue <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link to="/q/$slug" params={{ slug: "general-consultation" }}>
                    Join a queue
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Free for your first queue · no hardware · no customer app
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-4xl">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section className="border-b bg-card">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
            {[
              { v: "9 min", l: "average wait across QueueLess businesses" },
              { v: "31%", l: "drop in perceived waiting time" },
              { v: "1.4M", l: "tokens issued last quarter" },
            ].map((s) => (
              <div key={s.l} className="text-center sm:text-left">
                <p className="numeric text-3xl font-bold text-primary">{s.v}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Everything a busy counter needs, nothing it doesn't
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built with clinics, salons, service centres, restaurants and tuition centres that were
              tired of shouting numbers across a room.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Two-sided experience */}
        <section className="border-y bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Your customer's side is just as considered
              </h2>
              <p className="mt-3 max-w-lg text-ink-muted">
                A single page with their token, live position and an honest estimate — plus a nudge
                when it's nearly their turn, so nobody loses their place while grabbing a coffee.
              </p>
              <ol className="mt-8 space-y-4">
                {steps.map((s, i) => (
                  <li key={s.label} className="flex gap-4">
                    <span className="numeric grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{s.label}</p>
                      <p className="text-sm text-ink-muted">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/token/$tokenId" params={{ tokenId: "A-045" }}>
                    See the token page
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-ink-muted/40 bg-transparent text-ink-foreground hover:bg-sidebar-accent"
                >
                  <Link to="/how-it-works">How it works</Link>
                </Button>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[280px] rounded-[2rem] border border-sidebar-border bg-sidebar-accent/40 p-3">
              <div className="rounded-[1.6rem] bg-card p-4 text-card-foreground">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Riverside Family Clinic
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">General Consultation</p>
                <div className="mt-4 rounded-2xl bg-ink px-4 py-5 text-center text-ink-foreground">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">Your token</p>
                  <p className="numeric mt-1 text-4xl font-bold">A-045</p>
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/12 p-2.5">
                  <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
                  <p className="text-[11px] font-medium text-warning-foreground">
                    You're getting close — 2 people ahead
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border p-2.5">
                    <p className="numeric text-lg font-bold">2</p>
                    <p className="text-[10px] text-muted-foreground">ahead</p>
                  </div>
                  <div className="rounded-xl border p-2.5">
                    <p className="numeric text-lg font-bold">8m</p>
                    <p className="text-[10px] text-muted-foreground">to go</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Now serving A-042
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border bg-card p-8 text-center shadow-card sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Your waiting room could be empty by tomorrow
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Set up your first queue in two minutes. Print one QR code. Let people wait wherever
              they like.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/signup">Create your queue</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
