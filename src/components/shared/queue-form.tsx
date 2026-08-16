import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { QueueStatus } from "@/lib/mock-data";
import { api, ApiError } from "@/lib/api";
import { useApiStaff } from "@/lib/api-hooks";
import type { QueueDraft, QueueView } from "@/lib/queue-store";
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

function Section({
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

function splitHours(openHours: string | undefined) {
  const [from = "09:00", to = "18:00"] = (openHours ?? "").split(/\s*[–-]\s*/);
  return { from, to };
}

export function QueueForm({ queue, mode }: { queue?: QueueView; mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const hours = splitHours(queue?.openHours);

  const [name, setName] = useState(queue?.name ?? "");
  const [location, setLocation] = useState(queue?.location ?? "");
  const [prefix, setPrefix] = useState(queue?.tokenPrefix ?? "A");
  const [description, setDescription] = useState(queue?.description ?? "");
  const [avgServiceMinutes, setAvgServiceMinutes] = useState(String(queue?.avgServiceMinutes ?? 7));
  const [capacity, setCapacity] = useState(String(queue?.capacity ?? 120));
  const [openAt, setOpenAt] = useState(hours.from);
  const [closeAt, setCloseAt] = useState(hours.to);
  const { data: staffData } = useApiStaff();
  const staffDirectory = staffData?.data ?? [];
  const [assignee, setAssignee] = useState(queue?.staff[0] ?? "");
  const [live, setLive] = useState(queue ? queue.status === "active" : true);
  const [smsTwoAhead, setSmsTwoAhead] = useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [saving, setSaving] = useState(false);

  const slugPreview =
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "new-queue";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Queue name is required");
      return;
    }

    const status: QueueStatus = live ? "active" : queue?.status === "closed" ? "closed" : "paused";
    const draft: QueueDraft = {
      name,
      location,
      description,
      avgServiceMinutes: Number(avgServiceMinutes) || 1,
      capacity: Number(capacity) || 1,
      status,
      tokenPrefix: prefix,
      openHours: `${openAt} – ${closeAt}`,
      staff: assignee ? [assignee] : [],
    };

    setSaving(true);
    try {
      const payload = { ...draft, settings: { smsTwoAhead, whatsappUpdates } };
      if (mode === "create") {
        await api.createQueue(payload);
      } else {
        await api.updateQueue(queue!.id, payload);
      }
      toast.success(mode === "create" ? "Queue created" : "Queue updated", {
        description: "Changes are visible on your public page immediately.",
      });
      void navigate({ to: "/dashboard/queues" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save queue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[1.5fr_1fr]" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Section title="Basics" description="What customers see on the public queue page.">
          <div className="space-y-2">
            <Label htmlFor="qname">Queue name</Label>
            <Input
              id="qname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="General Consultation"
              required
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qloc">Counter / location</Label>
              <Input
                id="qloc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ground floor · Desk 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qprefix">Token prefix</Label>
              <Input
                id="qprefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qdesc">Description shown to customers</Label>
            <Textarea
              id="qdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Walk-in consultations. Please carry previous prescriptions."
            />
          </div>
        </Section>

        <Section
          title="Service settings"
          description="How QueueLess estimates waits and paces your counter."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qservice">Average service time (minutes)</Label>
              <Input
                id="qservice"
                type="number"
                min={1}
                value={avgServiceMinutes}
                onChange={(e) => setAvgServiceMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qcap">Daily token cap</Label>
              <Input
                id="qcap"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qopen">Opens at</Label>
              <Input
                id="qopen"
                type="time"
                value={openAt}
                onChange={(e) => setOpenAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qclose">Closes at</Label>
              <Input
                id="qclose"
                type="time"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qstaff">Assigned staff</Label>
            <Select value={assignee || undefined} onValueChange={setAssignee}>
              <SelectTrigger id="qstaff">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffDirectory.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="Customer experience" description="Notifications and join rules.">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="sw-sms" className="font-normal">SMS when 2 people ahead</Label>
            <Switch id="sw-sms" checked={smsTwoAhead} onCheckedChange={setSmsTwoAhead} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="sw-wa" className="font-normal">WhatsApp updates</Label>
            <Switch id="sw-wa" checked={whatsappUpdates} onCheckedChange={setWhatsappUpdates} />
          </div>
          {[
            { id: "sw-selfjoin", label: "Allow self-join by QR", checked: true },
            { id: "sw-party", label: "Ask for party size", checked: false },
            { id: "sw-priority", label: "Enable priority tokens", checked: false },
          ].map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={s.id} className="font-normal">
                {s.label}
              </Label>
              <Switch id={s.id} defaultChecked={s.checked} />
            </div>
          ))}
        </Section>

        <Section title="Publishing" description="Where this queue appears.">
          <div className="space-y-2">
            <Label htmlFor="qslug">Public link</Label>
            <Input id="qslug" value={`queueless.app/q/${queue?.slug ?? slugPreview}`} readOnly />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="sw-live" className="font-normal">
              Queue is live
            </Label>
            <Switch id="sw-live" checked={live} onCheckedChange={setLive} />
          </div>
        </Section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create queue" : "Save changes"}
          </Button>
          <Button asChild type="button" variant="outline" className="flex-1">
            <Link to="/dashboard/queues">Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
