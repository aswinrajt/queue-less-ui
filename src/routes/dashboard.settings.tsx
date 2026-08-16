import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { api, ApiError, type AuthBusiness } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Business settings — QueueLess" },
      { name: "description", content: "Update business details, public queue page branding, working hours and billing plan." },
      { property: "og:title", content: "Business settings — QueueLess" },
      { property: "og:description", content: "Control how your business appears to waiting customers." },
    ],
  }),
  component: SettingsPage,
});

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { business: sessionBusiness, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<AuthBusiness | null>(sessionBusiness);
  const [name, setName] = useState(sessionBusiness?.name ?? "");
  const [phone, setPhone] = useState(sessionBusiness?.phone ?? "");
  const [address, setAddress] = useState(sessionBusiness?.address ?? "");
  const [timezone, setTimezone] = useState(sessionBusiness?.timezone ?? "Asia/Kolkata");
  const [welcome, setWelcome] = useState(sessionBusiness?.publicPage?.welcomeMessage ?? "");
  const [showWait, setShowWait] = useState(sessionBusiness?.publicPage?.showEstimatedWait ?? true);
  const [showCount, setShowCount] = useState(sessionBusiness?.publicPage?.showWaitingCount ?? true);
  const [showNames, setShowNames] = useState(sessionBusiness?.publicPage?.showCustomerNames ?? false);
  const [hours, setHours] = useState(sessionBusiness?.workingHours ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${business?.slug ?? ""}`
      : `https://queueless.app/q/${business?.slug ?? ""}`;

  useEffect(() => {
    void api.getBusiness().then((data) => {
      setBusiness(data);
      setName(data.name);
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setTimezone(data.timezone);
      setWelcome(data.publicPage?.welcomeMessage ?? "");
      setShowWait(data.publicPage?.showEstimatedWait ?? true);
      setShowCount(data.publicPage?.showWaitingCount ?? true);
      setShowNames(data.publicPage?.showCustomerNames ?? false);
      setHours(data.workingHours ?? []);
    });
  }, []);

  async function save(partial: Parameters<typeof api.updateBusiness>[0]) {
    setSaving(true);
    try {
      const updated = await api.updateBusiness(partial);
      setBusiness(updated);
      await refreshMe();
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Business settings" subtitle={`${business?.name ?? "Your business"} · ${business?.plan ?? "Free"} plan`}>
      <Tabs defaultValue="profile">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="public">Public page</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="grid gap-6 xl:grid-cols-2">
          <Card title="Business details" description="Shown on your public queue and token pages.">
            <div className="space-y-2">
              <Label htmlFor="bname">Business name</Label>
              <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bphone">Contact number</Label>
              <Input id="bphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baddr">Address</Label>
              <Textarea id="baddr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="btz">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="btz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (BST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button disabled={saving} onClick={() => void save({ name, phone, address, timezone })}>
              Save changes
            </Button>
          </Card>

          <Card title="Danger zone" description="Irreversible actions for this business account.">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-semibold">Close all queues</p>
                <p className="text-sm text-muted-foreground">Release waiting customers and stop new joins.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  void api
                    .closeAllQueues()
                    .then((result) => toast.success(`${result.closed} queues closed`))
                    .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not close queues"));
                }}
              >
                Close queues
              </Button>
            </div>
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-semibold">Delete business</p>
                <p className="text-sm text-muted-foreground">Type the exact business name to confirm deletion.</p>
              </div>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={name || "Business name"}
              />
              <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="public" className="grid gap-6 xl:grid-cols-2">
          <Card title="Public queue page" description="What customers see when they scan your QR code.">
            <div className="space-y-2">
              <Label htmlFor="pslug">Public URL</Label>
              <div className="flex gap-2">
                <Input id="pslug" readOnly value={publicUrl} />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy link"
                  onClick={() => {
                    void navigator.clipboard.writeText(publicUrl);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwelcome">Welcome message</Label>
              <Textarea id="pwelcome" rows={3} value={welcome} onChange={(e) => setWelcome(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="pp-wait" className="font-normal">Show estimated wait time</Label>
              <Switch id="pp-wait" checked={showWait} onCheckedChange={setShowWait} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="pp-count" className="font-normal">Show number of people waiting</Label>
              <Switch id="pp-count" checked={showCount} onCheckedChange={setShowCount} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="pp-names" className="font-normal">Show customer first names publicly</Label>
              <Switch id="pp-names" checked={showNames} onCheckedChange={setShowNames} />
            </div>
            <Button
              disabled={saving}
              onClick={() =>
                void save({
                  publicPage: {
                    welcomeMessage: welcome,
                    showEstimatedWait: showWait,
                    showWaitingCount: showCount,
                    showCustomerNames: showNames,
                  },
                })
              }
            >
              Save changes
            </Button>
          </Card>

          <Card title="QR code" description="Print and place at your entrance and counters.">
            <div className="flex flex-col items-center rounded-2xl border border-dashed p-8">
              {business?.slug ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(publicUrl)}`}
                  alt="Public queue QR code"
                  className="h-40 w-40"
                />
              ) : (
                <QrCode className="h-28 w-28 text-foreground" strokeWidth={1.2} />
              )}
              <p className="mt-4 text-sm text-muted-foreground">{publicUrl}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const image = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(publicUrl)}`;
                window.open(image, "_blank", "noopener,noreferrer");
              }}
            >
              Open QR image
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card title="Working hours" description="Default hours applied to new queues.">
            <div className="space-y-3">
              {(hours.length
                ? hours
                : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
                    day,
                    open: "09:00",
                    close: day === "Sunday" ? "13:00" : "18:00",
                    isOpen: day !== "Sunday",
                  }))
              ).map((row, index) => (
                <div
                  key={row.day}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 sm:grid-cols-[140px_1fr_1fr_auto]"
                >
                  <p className="truncate text-sm font-medium">{row.day}</p>
                  <Input
                    type="time"
                    className="hidden sm:block"
                    value={row.open}
                    onChange={(e) =>
                      setHours((prev) => prev.map((h, i) => (i === index ? { ...h, open: e.target.value } : h)))
                    }
                  />
                  <Input
                    type="time"
                    className="hidden sm:block"
                    value={row.close}
                    onChange={(e) =>
                      setHours((prev) => prev.map((h, i) => (i === index ? { ...h, close: e.target.value } : h)))
                    }
                  />
                  <Switch
                    checked={row.isOpen}
                    aria-label={`${row.day} open`}
                    onCheckedChange={(isOpen) =>
                      setHours((prev) => prev.map((h, i) => (i === index ? { ...h, isOpen } : h)))
                    }
                  />
                </div>
              ))}
            </div>
            <Button disabled={saving} onClick={() => void save({ workingHours: hours })}>
              Save hours
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="grid gap-6 xl:grid-cols-2">
          <Card title="Current plan" description={`${business?.plan ?? "Free"} · manage upgrades in the billing portal.`}>
            <div className="rounded-xl border bg-secondary/50 p-4">
              <div className="flex items-baseline justify-between">
                <p className="numeric text-2xl font-bold">{business?.plan ?? "Free"}</p>
                <span className="text-sm text-muted-foreground">
                  {business?.smsUsed ?? 0}/{business?.smsIncluded ?? 2000} SMS used
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li>{business?.plan === "Free" ? "1 queue and 3 staff seats" : "Unlimited queues and tokens"}</li>
                <li>SMS credits reset with your plan</li>
                <li>Use Stripe test mode to upgrade</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  void api
                    .createCheckout()
                    .then((result) => {
                      if (result.url) window.location.href = result.url;
                    })
                    .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not start checkout"));
                }}
              >
                Upgrade
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void api
                    .createBillingPortal()
                    .then((result) => {
                      if (result.url) window.location.href = result.url;
                    })
                    .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not open portal"));
                }}
              >
                Manage billing
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this business?"
        description="Type the exact business name to confirm. This cannot be undone."
        confirmLabel="Delete forever"
        destructive
        onConfirm={() => {
          void api
            .deleteBusiness(confirmName)
            .then(async () => {
              await logout();
              void navigate({ to: "/" });
            })
            .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not delete"));
        }}
      />
    </DashboardShell>
  );
}
