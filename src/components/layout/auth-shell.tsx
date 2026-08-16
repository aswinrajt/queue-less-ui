import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/layout/logo";

const proof = [
  "Riverside Family Clinic · 227 served yesterday",
  "Blush Studio Salon · 9 min average wait",
  "TorqueLine Service Centre · 4 counters live",
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-8 sm:px-8">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
        <p className="text-xs text-muted-foreground">
          By continuing you agree to the QueueLess terms and privacy policy.
        </p>
      </div>

      <div className="relative hidden flex-col justify-between bg-ink p-10 text-ink-foreground lg:flex">
        <div className="absolute inset-0 grid-fade opacity-20" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">QueueLess</p>
          <h2 className="mt-4 max-w-sm text-3xl font-bold leading-tight">
            Stop waiting. Know your turn.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Replace paper tokens and crowded waiting rooms with a live queue your customers can
            follow from their phone.
          </p>
        </div>

        <div className="relative rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Now serving
              </p>
              <p className="numeric mt-1 text-5xl font-bold text-primary">A-042</p>
            </div>
            <div className="text-right">
              <p className="numeric text-2xl font-bold">14</p>
              <p className="text-xs text-ink-muted">waiting</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-ink-muted">
            {proof.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-muted">
          Curious first?{" "}
          <Link to="/q/$slug" params={{ slug: "general-consultation" }} className="font-semibold text-primary">
            Open a live queue page
          </Link>
        </p>
      </div>
    </div>
  );
}
