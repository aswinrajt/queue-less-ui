import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Set a new password — QueueLess" },
      { name: "description", content: "Choose a new password for your QueueLess account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a password with at least 8 characters."
      footer={
        <>
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to log in
          </Link>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const password = (event.currentTarget.elements.namedItem("password") as HTMLInputElement).value;
          setLoading(true);
          try {
            await api.resetPassword(token, password);
            toast.success("Password updated");
            void navigate({ to: "/login" });
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not reset password");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !token}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
