import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — QueueLess digital queue management" },
      {
        name: "description",
        content:
          "Simple per-location pricing for QueueLess. Start free with one queue, upgrade for SMS alerts, analytics and unlimited staff.",
      },
      { property: "og:title", content: "QueueLess pricing — queues from free" },
      {
        property: "og:description",
        content: "Free forever for one queue. Growth and Scale plans add SMS alerts, analytics and multi-location support.",
      },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Starter",
    price: "₹0",
    cadence: "forever",
    blurb: "For a single counter testing digital queues.",
    cta: "Start free",
    features: ["1 active queue", "Up to 50 tokens/day", "QR join page", "Live queue screen", "7-day history"],
    missing: ["SMS notifications", "Analytics exports"],
  },
  {
    name: "Growth",
    price: "₹1,499",
    cadence: "per location / month",
    blurb: "For busy clinics, salons and service centres.",
    cta: "Start 14-day trial",
    highlight: true,
    features: [
      "Unlimited queues",
      "Unlimited tokens",
      "SMS + WhatsApp alerts",
      "Staff accounts & roles",
      "Analytics dashboard",
      "Customer history & tags",
    ],
    missing: ["Dedicated success manager"],
  },
  {
    name: "Scale",
    price: "₹4,999",
    cadence: "per location / month",
    blurb: "For multi-branch operations and franchises.",
    cta: "Talk to sales",
    features: [
      "Everything in Growth",
      "Multi-location rollups",
      "Branded public pages",
      "API & webhooks",
      "Priority support",
      "Dedicated success manager",
    ],
    missing: [],
  },
];

const faqs = [
  {
    q: "Do my customers need to download an app?",
    a: "No. They scan a QR code or open a link, and the queue page works in any mobile browser. Their token stays live on that page.",
  },
  {
    q: "What counts as a location?",
    a: "One physical branch. You can run as many queues and counters inside a location as you need on Growth and Scale.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, upgrade or downgrade any time. Changes apply from your next billing cycle and queue history is never deleted.",
  },
  {
    q: "Are SMS alerts included?",
    a: "Growth includes 2,000 SMS credits per location per month, Scale includes 10,000. Extra credits can be topped up.",
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="border-b bg-card">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Pay per location. Never per waiting customer.
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              Every plan includes the public queue page, live counter screen and token history.
              No setup fees, cancel whenever.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border bg-card p-6 shadow-card ${
                  plan.highlight ? "border-primary/40 ring-1 ring-primary/20" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  {plan.highlight && (
                    <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="numeric text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
                <Button asChild className="mt-6" variant={plan.highlight ? "default" : "outline"}>
                  <Link to="/signup">{plan.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex gap-2.5 text-muted-foreground">
                      <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-card">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold">Questions, answered</h2>
            <Accordion type="single" collapsible className="mt-6">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
