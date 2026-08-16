import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { BellRing, CheckCircle2, Clock, Footprints, MapPin, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { StatusBadge } from "@/components/shared/status-badge";
import { TokenDisplay } from "@/components/shared/token-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";

export const Route = createFileRoute("/token/$tokenId")({
  head: () => ({
    meta: [
      { title: "Your queue token — Riverside Family Clinic | QueueLess" },
      {
        name: "description",
        content: "Track your place in line live: token number, people ahead and estimated wait.",
      },
      { property: "og:title", content: "Your QueueLess token" },
      { property: "og:description", content: "Live position, people ahead and estimated wait — no need to stand in line." },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const { tokenId } = useParams({ from: "/token/$tokenId" });
  const navigate = useNavigate();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-token", tokenId],
    queryFn: () => api.getPublicToken(tokenId),
    refetchInterval: 10_000,
  });
  const refreshToken = useCallback(() => {
    void refetch();
  }, [refetch]);
  useRealtime("token", tokenId, refreshToken);
  const ticket = data?.ticket;
  const queue = data?.queue;
  const business = data?.business;
  const alerts = data?.alerts;

  if (!isLoading && (isError || !ticket || !queue)) {
    return (
      <div className="min-h-screen bg-secondary/40 px-4 py-16">
        <div className="mx-auto max-w-md">
          <ErrorState
            title="We can't find this token"
            description="It may have been released, or the queue was closed. Join again from the queue page."
            action={
              <Button asChild>
                <Link to="/">Back to QueueLess</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (isLoading || !ticket || !queue) {
    return (
      <div className="min-h-screen bg-secondary/40 px-4 py-16">
        <div className="mx-auto max-w-md animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-card" />
          <div className="h-32 rounded-2xl bg-card" />
          <div className="h-24 rounded-2xl bg-card" />
        </div>
      </div>
    );
  }

  const inLine = ticket.peopleAhead + (ticket.status === "waiting" ? 1 : 0);
  const progress =
    ticket.status === "serving" || ticket.status === "served"
      ? 100
      : inLine > 0
        ? Math.max(4, Math.round(((inLine - ticket.peopleAhead) / inLine) * 100))
        : 100;
  const close = alerts?.gettingClose ?? (ticket.status === "waiting" && ticket.peopleAhead <= 2);

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Logo />
          <StatusBadge tone={ticket.status} />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-16 pt-6">
        {ticket.status === "serving" && (
          <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">It's your turn</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Please go to {queue.location} now — {queue.name}.
              </p>
            </div>
          </div>
        )}

        {ticket.status === "served" && (
          <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-semibold">Visit complete</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Thanks for visiting {business?.name}.
              </p>
            </div>
          </div>
        )}

        {ticket.status === "skipped" && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Your token was skipped</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Please speak to the reception desk to be added back.
              </p>
            </div>
          </div>
        )}

        {ticket.status === "held" && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/12 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
            <div>
              <p className="text-sm font-semibold text-warning-foreground">You're on hold</p>
              <p className="mt-0.5 text-sm text-warning-foreground/80">
                Staff parked your token and will return you to the line shortly.
              </p>
            </div>
          </div>
        )}

        {close && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/12 p-4">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
            <div>
              <p className="text-sm font-semibold text-warning-foreground">You're getting close</p>
              <p className="mt-0.5 text-sm text-warning-foreground/80">
                Only {ticket.peopleAhead} ahead — please head to the counter area now.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {business?.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{queue.name}</p>
        </div>

        <TokenDisplay token={ticket.token} caption="Your token" size="xl" tone="ink" className="mt-4" />

        <div className="mt-4 rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Now serving</span>
            <span className="numeric text-lg font-bold">{queue.nowServing}</span>
          </div>
          <Progress value={progress} className="mt-3" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Joined at {ticket.joinedAt}</span>
            <span className="numeric">{progress}% of your wait done</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
            <Footprints className="mx-auto h-4.5 w-4.5 text-muted-foreground" />
            <p className="numeric mt-2 text-3xl font-bold">{ticket.peopleAhead}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">people ahead</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
            <Clock className="mx-auto h-4.5 w-4.5 text-muted-foreground" />
            <p className="numeric mt-2 text-3xl font-bold">
              {ticket.estimatedWait}
              <span className="text-lg"> min</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">estimated wait</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold">Where to go</p>
          <p className="mt-1.5 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {queue.location}, {business?.address}
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void refetch();
              toast.success("Status refreshed", {
                description:
                  ticket.status === "waiting"
                    ? `${ticket.peopleAhead} ahead · about ${ticket.estimatedWait} minutes`
                    : "Your token status is up to date.",
              });
            }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh status
          </Button>
          {(ticket.status === "waiting" || ticket.status === "held") && (
            <Button variant="ghost" className="text-destructive" onClick={() => setLeaveOpen(true)}>
              <XCircle className="h-4 w-4" /> Leave the queue
            </Button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Wrong queue?{" "}
          <Link to="/q/$slug" params={{ slug: queue.slug }} className="font-semibold text-primary">
            Back to queue page
          </Link>
        </p>
      </main>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave the queue?"
        description={`Your token ${ticket.token} will be released and you'll lose your place in line.`}
        confirmLabel="Leave queue"
        destructive
        onConfirm={async () => {
          try {
            await api.leavePublicToken(ticket.token);
            toast("You left the queue", { description: `Token ${ticket.token} released.` });
            void navigate({ to: "/q/$slug", params: { slug: queue.slug } });
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not leave the queue");
          }
        }}
      />
    </div>
  );
}
