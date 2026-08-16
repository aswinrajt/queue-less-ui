import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, tone = "default" }: { className?: string; tone?: "default" | "invert" }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 7h10M4 12h7M4 17h4" />
          <circle cx="18" cy="15" r="4" />
          <path d="M18 13.5V15l1 1" strokeWidth="1.6" />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          tone === "invert" ? "text-ink-foreground" : "text-foreground",
        )}
      >
        Queue<span className="text-primary">Less</span>
      </span>
    </Link>
  );
}
