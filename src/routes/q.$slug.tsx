import { useState } from "react";
import { Link, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Clock, Loader2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { StatusBadge } from "@/components/shared/status-badge";
import { TokenDisplay } from "@/components/shared/token-display";
import { Modal } from "@/components/shared/modal";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/q/$slug")({
  head: () => ({
    meta: [
      { title: "Join the queue — Riverside Family Clinic | QueueLess" },
      {
        name: "description",
        content:
          "Live queue at Riverside Family Clinic. See who is being served, how many are waiting, and join from your phone.",
      },
      { property: "og:title", content: "Join the queue at Riverside Family Clinic" },
      {
        property: "og:description",
        content: "See the token being served, people waiting and estimated wait. Join without standing in line.",
      },
    ],
  }),
  component: PublicQueuePage,
});

function PublicQueuePage() {
  const { slug } = useParams({ from: "/q/$slug" });
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-queue", slug],
    queryFn: () => api.getPublicQueue(slug),
    refetchInterval: 10_000,
  });

  const [open, setOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("1");

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-secondary/40 px-4 py-16">
        <div className="mx-auto max-w-md">
          <ErrorState
            title="This queue isn't available"
            description="The link may be out of date, or the business closed this queue for today."
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

  const { queue, business, upcoming } = data;
  const estimated = queue.estimatedWaitMinutes;
  const joinable = queue.canJoin;

  async function handleJoin() {
    setJoining(true);
    try {
      const result = await api.joinPublicQueue(slug, {
        name,
        phone,
        partySize: Number(partySize) || 1,
        channel: "QR scan",
      });
      setOpen(false);
      setName("");
      setPhone("");
      setPartySize("1");
      toast.success(`Token ${result.ticket.token} reserved`, {
        description: `${result.ticket.peopleAhead} ahead · about ${result.ticket.estimatedWait} minutes`,
      });
      void navigate({ to: "/token/$tokenId", params: { tokenId: result.ticket.token } });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not join queue");
    } finally {
      setJoining(false);
      void refetch();
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Logo />
          <StatusBadge
            tone={queue.status}
            {...(queue.status === "active" ? { label: "Queue live" } : {})}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-16 pt-6">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {business.name}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold">{queue.name}</h1>
          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> {queue.location}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" /> Open today {queue.openHours}
            </p>
          </div>
        </div>

        <TokenDisplay
          token={queue.nowServing}
          caption="Currently serving"
          size="xl"
          tone="ink"
          className="mt-4"
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
            <Users className="mx-auto h-4.5 w-4.5 text-muted-foreground" />
            <p className="numeric mt-2 text-3xl font-bold">{queue.waitingCount}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">people waiting</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
            <Clock className="mx-auto h-4.5 w-4.5 text-muted-foreground" />
            <p className="numeric mt-2 text-3xl font-bold">
              {estimated}
              <span className="text-lg"> min</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">estimated wait</p>
          </div>
        </div>

        <Button
          size="lg"
          className="mt-4 w-full text-base"
          disabled={!joinable}
          onClick={() => setOpen(true)}
        >
          {queue.status === "active" ? "Join queue" : "Queue is not accepting joins"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {joinable
            ? "You'll get a token instantly and a text when you're close."
            : queue.status === "paused"
              ? "This queue is paused — check back in a few minutes."
              : "This queue is closed for now."}
        </p>

        <div className="mt-8 rounded-2xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Next up</p>
            <span className="text-xs text-muted-foreground">Updated just now</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nobody is waiting — you'd be called straight away.
            </p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((t, i) => (
                <li key={`${t.token}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="numeric rounded-lg bg-secondary px-2.5 py-1 text-sm font-bold">
                      {t.token}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {t.name ?? (i === 0 ? "Up next" : `${i + 1} in line`)}
                    </span>
                  </div>
                  <span className="numeric shrink-0 text-sm text-muted-foreground">
                    ~{t.waitMinutes}m
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Join ${queue.name}`}
        description="We only need a name and number so we can call you."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={joining || !name.trim()} onClick={handleJoin}>
              {joining && <Loader2 className="h-4 w-4 animate-spin" />}
              {joining ? "Reserving…" : "Confirm & get token"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-name">Your name</Label>
            <Input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kavya Menon"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-phone">Mobile number</Label>
            <Input
              id="join-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98111 20345"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-size">People with you</Label>
            <Input
              id="join-size"
              type="number"
              min={1}
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
