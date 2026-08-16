import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — QueueLess" },
      { name: "description", content: "Request a password reset link for your QueueLess business account." },
      { property: "og:title", content: "Reset your QueueLess password" },
      { property: "og:description", content: "We'll email you a secure link to set a new password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? "If an account exists for that email, a reset link is on its way."
          : "Enter the email you use for QueueLess and we'll send a reset link."
      }
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to log in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-2xl border bg-card p-6 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-success/12 text-success">
            <MailCheck className="h-5.5 w-5.5" />
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            The link expires in 30 minutes. Didn't get it? Check spam, or resend below.
          </p>
          <Button variant="outline" className="mt-5 w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
            setLoading(true);
            try {
              const result = await api.forgotPassword(email);
              setSent(true);
              if (result.resetUrl) {
                toast.message("Dev reset link", { description: result.resetUrl });
              }
            } catch (error) {
              toast.error(error instanceof ApiError ? error.message : "Could not send reset link");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" name="email" type="email" placeholder="you@business.com" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
