import { cn } from "@/lib/utils";

export function TokenDisplay({
  token,
  caption,
  size = "lg",
  tone = "default",
  className,
}: {
  token: string;
  caption?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "ink" | "primary";
  className?: string;
}) {
  const sizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
    xl: "text-[clamp(3.5rem,18vw,7rem)] leading-none",
  } as const;

  const tones = {
    default: "border bg-card text-foreground",
    ink: "border-transparent bg-ink text-ink-foreground",
    primary: "border-primary/25 bg-primary/10 text-primary",
  } as const;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl px-6 py-8 shadow-card",
        tones[tone],
        className,
      )}
    >
      {caption && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
          {caption}
        </span>
      )}
      <span className={cn("numeric mt-2 font-bold tracking-tight", sizes[size])}>{token}</span>
    </div>
  );
}
