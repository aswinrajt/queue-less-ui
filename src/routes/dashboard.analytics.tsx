import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, TrendingUp, UserCheck, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiAnalytics } from "@/lib/api-hooks";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — QueueLess" },
      { name: "description", content: "Wait time trends, hourly demand, join channels and per-queue performance." },
      { property: "og:title", content: "Queue analytics — QueueLess" },
      { property: "og:description", content: "Understand demand peaks and cut waiting time with per-queue insights." },
    ],
  }),
  component: AnalyticsPage,
});

const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function AnalyticsPage() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const { data } = useApiAnalytics(range);
  const overview = data?.overview ?? { served: 0, avgWaitMinutes: 0, peakHour: "—", peakHourJoins: 0, selfJoinShare: 0 };
  const hourlyVolume = data?.hourly ?? [];
  const waitTrend = data?.waitTrend ?? [];
  const channelSplit = data?.channels ?? [];
  const queues = data?.queues ?? [];

  return (
    <DashboardShell title="Analytics" subtitle={`${range} · all queues`}>
      <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)} className="mb-6">
        <TabsList>
          <TabsTrigger value="24h">24 hours</TabsTrigger>
          <TabsTrigger value="7d">7 days</TabsTrigger>
          <TabsTrigger value="30d">30 days</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers served" value={overview.served} icon={UserCheck} accent="success" trendLabel="in this range" />
        <StatCard label="Average wait" value={overview.avgWaitMinutes} unit="min" icon={Clock} accent="warning" trendLabel="before being called" />
        <StatCard label="Peak hour load" value={overview.peakHourJoins} unit="joins" icon={TrendingUp} trendLabel={overview.peakHour} />
        <StatCard label="Self-join share" value={`${overview.selfJoinShare}%`} icon={Users} accent="info" trendLabel="QR + web link" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Joins vs. served by hour</h2>
          <p className="text-sm text-muted-foreground">Where your counters fall behind demand.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyVolume}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="joined" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="served" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Average wait trend</h2>
          <p className="text-sm text-muted-foreground">Minutes waited before being called.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waitTrend}>
                <defs>
                  <linearGradient id="waitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="wait"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#waitFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">How customers join</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelSplit} dataKey="value" nameKey="channel" innerRadius={54} outerRadius={86} paddingAngle={3}>
                  {channelSplit.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {channelSplit.map((c, i) => (
              <li key={c.channel} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: pieColors[i % pieColors.length] }}
                  />
                  {c.channel}
                </span>
                <span className="numeric font-semibold">{c.value}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Per-queue performance</h2>
          <div className="mt-4 space-y-4">
            {queues.map((q) => {
              const total = q.servedToday + q.waiting;
              const efficiency = total > 0 ? Math.min(100, Math.round((q.servedToday / total) * 100)) : 0;
              return (
                <div key={q.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{q.name}</span>
                    <span className="numeric shrink-0 text-muted-foreground">
                      {q.servedToday} served · {q.avgWaitMinutes}m avg
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${efficiency}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
