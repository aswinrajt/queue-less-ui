import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your queue — QueueLess sign up" },
      {
        name: "description",
        content: "Set up a digital queue for your clinic, salon, restaurant or service centre in minutes. Free for one queue.",
      },
      { property: "og:title", content: "Create your first QueueLess queue" },
      { property: "og:description", content: "Free to start, no hardware, no app for your customers to install." },
    ],
  }),
  component: SignupPage,
});

const types = ["Clinic / diagnostics", "Salon / spa", "Service centre", "Restaurant", "Tuition centre", "Other"];

function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [businessType, setBusinessType] = useState(types[0]!);
  const navigate = useNavigate();
  const { applySession } = useAuth();

  return (
    <AuthShell
      title="Create your queue"
      subtitle="Two minutes to your first live queue. No card required."
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
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = (form.elements.namedItem("name") as HTMLInputElement).value;
          const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
          const businessName = (form.elements.namedItem("business") as HTMLInputElement).value;
          const email = (form.elements.namedItem("email") as HTMLInputElement).value;
          const password = (form.elements.namedItem("password") as HTMLInputElement).value;
          setLoading(true);
          try {
            const session = await api.signup({ name, phone, businessName, businessType, email, password });
            applySession(session);
            toast.success("Account created", { description: "Your business dashboard is ready." });
            void navigate({ to: "/dashboard" });
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not create account");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" placeholder="Meera Nair" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="+91 98450 11223" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="business">Business name</Label>
          <Input id="business" name="business" placeholder="Your clinic or shop name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Business type</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@business.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
