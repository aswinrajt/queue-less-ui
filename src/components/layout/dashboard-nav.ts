import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListOrdered,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";

export const dashboardNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/queues", label: "Queues", icon: ListOrdered, badge: "4" },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: "3" },
  { to: "/dashboard/staff", label: "Staff", icon: UsersRound },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;
