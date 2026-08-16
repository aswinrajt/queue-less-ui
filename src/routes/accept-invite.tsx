import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Accept your invite — QueueLess" },
      { name: "description", content: "Set a password and join your team's QueueLess workspace." },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { applySession } = useAuth();

  return (
    <AuthShell
      title="Join your team"
      subtitle="Set a password to start calling tokens."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = (form.elements.namedItem("name") as HTMLInputElement).value;
          const password = (form.elements.namedItem("password") as HTMLInputElement).value;
          setLoading(true);
          try {
            const session = await api.acceptInvite({ inviteToken: token, password, name: name || undefined });
            applySession(session);
            toast.success("Invite accepted");
            void navigate({ to: "/dashboard" });
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not accept invite");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Your name (optional)</Label>
          <Input id="name" name="name" placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !token}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Joining…" : "Accept invite"}
        </Button>
      </form>
    </AuthShell>
  );
}
