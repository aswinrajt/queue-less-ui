import { Phone, Repeat, UserRound } from "lucide-react";
import type { Customer } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Tag({ label }: { label: string }) {
  const tone =
    label === "Priority"
      ? "bg-primary/10 text-primary"
      : label === "No-show risk"
        ? "bg-destructive/10 text-destructive"
        : label === "New"
          ? "bg-info/12 text-info"
          : "bg-secondary text-secondary-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
  );
}

export function CustomerTable({
  customers,
  onView,
}: {
  customers: Customer[];
  onView?: (c: Customer) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead className="text-right">Avg wait</TableHead>
              <TableHead className="text-right">No-shows</TableHead>
              <TableHead>Last visit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {c.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <Tag key={t} label={t} />
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                <TableCell className="numeric text-right">{c.visits}</TableCell>
                <TableCell className="numeric text-right">{c.avgWait}m</TableCell>
                <TableCell className="numeric text-right">{c.noShows}</TableCell>
                <TableCell className="text-muted-foreground">{c.lastVisit}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onView?.(c)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y md:hidden">
        {customers.map((c) => (
          <li key={c.id} className="p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {c.phone}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <Tag key={t} label={t} />
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => onView?.(c)}>
                View
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5" /> {c.visits} visits
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" /> {c.noShows} no-shows
              </span>
              <span>Last: {c.lastVisit}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
