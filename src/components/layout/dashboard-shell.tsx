import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MobileNav } from "@/components/layout/mobile-nav";

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <DashboardHeader title={title} {...(subtitle ? { subtitle } : {})} />
      <main className="px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
        {actions && <div className="mb-6 flex flex-wrap items-center gap-2">{actions}</div>}
        {children}
      </main>
      <MobileNav />
    </>
  );
}
