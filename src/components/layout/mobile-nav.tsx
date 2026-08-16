import { Link } from "@tanstack/react-router";
import { BarChart3, Bell, LayoutDashboard, ListOrdered, Users } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/queues", label: "Queues", icon: ListOrdered, exact: false },
  { to: "/dashboard/customers", label: "People", icon: Users, exact: false },
  { to: "/dashboard/analytics", label: "Stats", icon: BarChart3, exact: false },
  { to: "/dashboard/notifications", label: "Alerts", icon: Bell, exact: false },
] as const;

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
