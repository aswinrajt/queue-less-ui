import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StaffMember } from "@/lib/mock-data";
import { api, ApiError } from "@/lib/api";
import { useApiStaff } from "@/lib/api-hooks";

export const Route = createFileRoute("/dashboard/staff")({
  head: () => ({
    meta: [
      { title: "Staff — QueueLess" },
      { name: "description", content: "Invite counter staff, set roles and see who is serving which queue today." },
      { property: "og:title", content: "Staff management — QueueLess" },
      { property: "og:description", content: "Roles, queue assignments and daily service counts for your team." },
    ],
  }),
  component: StaffPage,
});

const statusTone: Record<StaffMember["status"], string> = {
  Active: "bg-success/12 text-success",
  Invited: "bg-info/12 text-info",
  "Off duty": "bg-secondary text-muted-foreground",
};

function StaffPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<StaffMember | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Manager" | "Counter staff">("Counter staff");
  const queryClient = useQueryClient();
  const { data } = useApiStaff();
  const members = data?.data ?? [];
  const stats = data?.stats;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["staff"] });
  }

  return (
    <DashboardShell
      title="Staff"
      subtitle={`${stats?.totalMembers ?? 0} team members · ${stats?.onDutyNow ?? 0} on duty`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Team members"
          value={stats?.totalMembers ?? 0}
          icon={UsersRound}
          trendLabel={`${stats?.seatsRemaining ?? 0} seats left`}
        />
        <StatCard label="On duty now" value={stats?.onDutyNow ?? 0} icon={UsersRound} accent="success" trendLabel="active accounts" />
        <StatCard label="Served today" value={stats?.servedToday ?? 0} icon={UsersRound} accent="info" trendLabel="across all queues" />
        <StatCard label="Busiest counter" value={stats?.busiestCounter ?? "—"} icon={UsersRound} accent="warning" trendLabel="today" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Roles control who can call tokens and edit queues.</p>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite staff
        </Button>
      </div>

      <ul className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {members.map((m) => (
          <li key={m.id} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0" aria-label="Staff actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      void api
                        .updateStaff(m.id, { role: m.role === "Manager" ? "Counter staff" : "Manager" })
                        .then(() => {
                          toast.success("Role updated");
                          void refresh();
                        })
                        .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not update"));
                    }}
                  >
                    Change role
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void api
                        .updateStaff(m.id, { status: m.status === "Active" ? "Off duty" : "Active" })
                        .then(() => {
                          toast.success("Status updated");
                          void refresh();
                        })
                        .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not update"));
                    }}
                  >
                    Toggle duty
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={() => setToRemove(m)}>
                    Remove access
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {m.role}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[m.status] ?? statusTone.Active}`}>
                {m.status}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
              <span className="truncate text-muted-foreground">{m.queues}</span>
              <span className="numeric shrink-0 font-semibold">{m.servedToday} served</span>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite a team member"
        description="They'll get a link to set a password and start calling tokens."
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void api
                  .inviteStaff({ name, email, role })
                  .then((result) => {
                    setInviteOpen(false);
                    setName("");
                    setEmail("");
                    toast.success("Invite sent", {
                      description: result.acceptUrl ?? "Access starts once they accept.",
                    });
                    void refresh();
                  })
                  .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not invite"));
              }}
            >
              Send invite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inv-name">Full name</Label>
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vikram Prasad" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-email">Work email</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vikram@business.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-role">Role</Label>
            <Select value={role === "Manager" ? "manager" : "counter"} onValueChange={(v) => setRole(v === "manager" ? "Manager" : "Counter staff")}>
              <SelectTrigger id="inv-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="counter">Counter staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null);
        }}
        title={`Remove ${toRemove?.name ?? "this member"}?`}
        description="They will lose access to all queues immediately. Service history is kept."
        confirmLabel="Remove access"
        destructive
        onConfirm={() => {
          if (!toRemove) return;
          void api
            .deleteStaff(toRemove.id)
            .then(() => {
              toast("Access removed");
              void refresh();
            })
            .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not remove"));
        }}
      />
    </DashboardShell>
  );
}
