import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CustomerTable } from "@/components/shared/customer-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/lib/mock-data";
import { api, ApiError } from "@/lib/api";
import { useApiCustomers, useApiQueues } from "@/lib/api-hooks";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard/customers")({
  head: () => ({
    meta: [
      { title: "Customers — QueueLess" },
      { name: "description", content: "Customer history, visit counts, no-shows and tags across all your queues." },
      { property: "og:title", content: "Customer directory — QueueLess" },
      { property: "og:description", content: "Know your regulars, spot no-show risk and keep visit history in one place." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [tab, setTab] = useState<"all" | "regulars" | "risk">("all");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const queryClient = useQueryClient();
  const { data: queues = [] } = useApiQueues();
  const { data } = useApiCustomers(search, tab);
  const customers = data?.data ?? [];
  const openQueue = queues.find((q) => q.status === "active");

  const stats = useMemo(() => {
    const totalVisits = customers.reduce((sum, c) => sum + c.visits, 0);
    const totalNoShows = customers.reduce((sum, c) => sum + c.noShows, 0);
    const repeatShare = customers.length
      ? Math.round((customers.filter((c) => c.visits > 1).length / customers.length) * 100)
      : 0;
    return {
      repeatShare,
      avgVisits: customers.length ? (totalVisits / customers.length).toFixed(1) : "0",
      noShowRate: totalVisits ? ((totalNoShows / totalVisits) * 100).toFixed(1) : "0",
    };
  }, [customers]);

  async function addWalkIn(event: React.FormEvent) {
    event.preventDefault();
    if (!openQueue) {
      toast.error("Open a queue before adding walk-ins");
      return;
    }
    try {
      const ticket = await api.walkIn(openQueue.id, { name: walkInName, phone: walkInPhone });
      toast.success("Walk-in added", {
        description: `Token ${ticket.token} issued for ${openQueue.name}.`,
      });
      setWalkInName("");
      setWalkInPhone("");
      setWalkInOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add walk-in");
    }
  }

  async function downloadExport() {
    try {
      const blob = await api.exportCustomers();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "customers.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not export");
    }
  }

  return (
    <DashboardShell
      title="Customers"
      subtitle={`${data?.pagination.total ?? customers.length} people have joined your queues`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={data?.pagination.total ?? customers.length} icon={Users} trendLabel="from live joins" />
        <StatCard label="Repeat visitors" value={`${stats.repeatShare}%`} icon={Users} accent="success" trendLabel="visited more than once" />
        <StatCard label="No-show rate" value={`${stats.noShowRate}%`} icon={Users} accent="warning" trendLabel="of all visits" />
        <StatCard label="Avg visits / customer" value={stats.avgVisits} icon={Users} accent="info" trendLabel="lifetime" />
      </div>

      <div className="mt-6 grid gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="regulars">Regulars</TabsTrigger>
            <TabsTrigger value="risk">No-show risk</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or number"
            className="pl-9"
          />
        </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void downloadExport()}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={() => setWalkInOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add walk-in
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Join a queue with a phone number and that person will appear here."
          />
        ) : (
          <CustomerTable
            customers={customers.map((c) => ({
              ...c,
              lastVisit: c.lastVisit.slice(0, 10),
            }))}
            onView={(c) => setSelected(c)}
          />
        )}
      </div>

      <Modal
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        title="Add a walk-in"
        description={
          openQueue
            ? `A token will be issued for ${openQueue.name}.`
            : "No queue is open right now."
        }
      >
        <form id="walkin-form" className="grid gap-4" onSubmit={addWalkIn}>
          <div className="space-y-1.5">
            <Label htmlFor="walkin-name">Customer name</Label>
            <Input
              id="walkin-name"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="Ravi Kumar"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="walkin-phone">Phone (optional)</Label>
            <Input
              id="walkin-phone"
              value={walkInPhone}
              onChange={(e) => setWalkInPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <Button type="submit" disabled={!openQueue}>
            Issue token
          </Button>
        </form>
      </Modal>

      <Modal
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.name ?? "Customer"}
        description={selected ? `${selected.visits} visits · last seen ${selected.lastVisit.slice(0, 10)}` : ""}
        footer={
          <Button
            onClick={() => {
              if (!selected) return;
              void api
                .sendQueueLink(selected.id, openQueue?.id)
                .then(() => toast.success("Queue link sent"))
                .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not send"));
            }}
          >
            Send queue link
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input readOnly value={selected?.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Average wait</Label>
            <Input readOnly value={`${selected?.avgWait ?? 0} min`} />
          </div>
          <div className="space-y-1.5">
            <Label>No-shows</Label>
            <Input readOnly value={String(selected?.noShows ?? 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input readOnly value={(selected?.tags ?? []).join(", ")} />
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
