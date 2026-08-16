import { cn } from "@/lib/utils";

const tones = {
  active: "bg-success/12 text-success border-success/25",
  serving: "bg-primary/12 text-primary border-primary/25",
  waiting: "bg-info/12 text-info border-info/25",
  paused: "bg-warning/15 text-warning-foreground border-warning/35",
  closed: "bg-muted text-muted-foreground border-border",
  served: "bg-success/12 text-success border-success/25",
  skipped: "bg-destructive/10 text-destructive border-destructive/25",
  held: "bg-warning/15 text-warning-foreground border-warning/35",
  neutral: "bg-secondary text-secondary-foreground border-border",
} as const;

export type BadgeTone = keyof typeof tones;

const labels: Record<string, string> = {
  active: "Live",
  serving: "Serving",
  waiting: "Waiting",
  paused: "Paused",
  closed: "Closed",
  served: "Served",
  skipped: "Skipped",
  held: "On hold",
};

export function StatusBadge({
  tone,
  label,
  dot = true,
  className,
}: {
  tone: BadgeTone;
  label?: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {(tone === "active" || tone === "serving") && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label ?? labels[tone] ?? tone}
    </span>
  );
}
