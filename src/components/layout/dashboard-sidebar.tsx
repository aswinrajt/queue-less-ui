import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { dashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useApiQueues } from "@/lib/api-hooks";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { business } = useAuth();
  const { data: queues = [] } = useApiQueues();
  const publicSlug = queues[0]?.slug;
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo tone="invert" />
      </div>

      <div className="px-4 py-4">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
          <p className="truncate text-sm font-semibold">{business?.name ?? "Your business"}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{business?.plan ?? "Free"} plan · {queues.length} queues</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {dashboardNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: "exact" in item ? item.exact : false }}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{
              className: "bg-sidebar-accent text-sidebar-accent-foreground",
            }}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {"badge" in item && item.badge && (
              <span className="numeric shrink-0 rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-[11px] font-semibold text-sidebar-primary">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-4">
        <Button asChild className="w-full">
          <Link to="/dashboard/queues/new" onClick={onNavigate}>
            <Plus className="h-4 w-4" /> New queue
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="w-full justify-between text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Link to="/q/$slug" params={{ slug: publicSlug ?? "queue" }} onClick={onNavigate}>
            View public page <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border lg:block">
      <SidebarContent />
    </aside>
  );
}
