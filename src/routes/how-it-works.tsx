import { Link, createFileRoute } from "@tanstack/react-router";
import { BellRing, MonitorSmartphone, QrCode, ScanLine, Settings2, Sparkles } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How QueueLess works — digital queues in three steps" },
      {
        name: "description",
        content:
          "See how QueueLess replaces paper tokens and crowded waiting rooms: create a queue, share a QR code, and call customers from any device.",
      },
      { property: "og:title", content: "How QueueLess works" },
      {
        property: "og:description",
        content: "Create a queue, share a QR code, call the next customer. Built for clinics, salons, restaurants and service centres.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const steps = [
  {
    icon: Settings2,
    title: "Create your queue",
    body: "Name the queue, pick a token prefix, set service time and opening hours. Takes about two minutes, no hardware needed.",
  },
  {
    icon: QrCode,
    title: "Share the QR code or link",
    body: "Print the QR for your entrance and counter, or send the link over WhatsApp. Customers join from their own phone.",
  },
  {
    icon: MonitorSmartphone,
    title: "Call next from any screen",
    body: "Your counter staff work from one live screen: call next, skip no-shows, complete visits. Everyone sees the same order.",
  },
];

const audiences = [
  { title: "Clinics & diagnostics", body: "Separate queues for consultation, lab and pharmacy with priority tokens for seniors." },
  { title: "Salons & spas", body: "Let walk-ins wait from a café nearby instead of your reception sofa." },
  { title: "Service centres", body: "Job-card queues with staff-wise load so nobody sits at an empty counter." },
  { title: "Restaurants", body: "Table waitlists with party size and a text when the table is ready." },
  { title: "Tuition centres", body: "Parent-meeting slots and fee-counter queues on busy admission days." },
  { title: "Government & utility desks", body: "High-volume token queues with clear public displays and daily reporting." },
];

const outcomes = [
  { stat: "31%", label: "shorter perceived wait after switching from paper tokens" },
  { stat: "3.4x", label: "fewer “how long more?” questions at reception" },
  { stat: "9 min", label: "average wait across QueueLess businesses" },
];

function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="border-b bg-card">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              A waiting room that lives on your customer's phone
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              QueueLess keeps one shared source of truth for who is next — visible to your staff on
              a live screen and to your customers wherever they are.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="numeric text-sm font-semibold text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">What the customer experiences</h2>
              <ul className="mt-6 space-y-5">
                <li className="flex gap-4">
                  <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Scan and join</p>
                    <p className="text-sm text-ink-muted">
                      Name and phone number, nothing more. A token appears instantly.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Watch the queue move</p>
                    <p className="text-sm text-ink-muted">
                      Live position, people ahead and an honest estimated wait.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Get nudged in time</p>
                    <p className="text-sm text-ink-muted">
                      A “you're getting close” alert at two people ahead, then a final call.
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/q/$slug" params={{ slug: "general-consultation" }}>See a live queue page</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-ink-muted/40 bg-transparent text-ink-foreground hover:bg-sidebar-accent"
                >
                  <Link to="/token/$tokenId" params={{ tokenId: "A-045" }}>See a token page</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {outcomes.map((o) => (
                <div key={o.label} className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-5">
                  <p className="numeric text-3xl font-bold text-primary">{o.stat}</p>
                  <p className="mt-1.5 text-sm text-ink-muted">{o.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold">Built for businesses where people wait</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-2xl border bg-card p-5 shadow-card">
                <h3 className="text-base font-semibold">{a.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
