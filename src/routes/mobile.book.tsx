import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, todayISO } from "@/lib/app-store";
import {
  BUILDINGS_BY_LOCATION,
  DESKS_BY_FLOOR,
  FLOORS,
  type FloorId,
  type LocationId,
} from "@/data/desks";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/mobile/book")({
  component: MobileBookPage,
});

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function MobileBookPage() {
  const { user, addBooking, bookingsForDate } = useAppStore();
  const userLocation = (user.location ?? "London") as LocationId;
  const building = BUILDINGS_BY_LOCATION[userLocation];
  const [floor, setFloor] = useState<FloorId>(building.floorIds[0]!);
  const [date, setDate] = useState<string>(todayISO());

  const dayChips = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i));
  const desksOnFloor = DESKS_BY_FLOOR[floor];
  const dayBookings = bookingsForDate(date);
  const bookedIds = useMemo(
    () => new Set(dayBookings.map((b) => b.deskId).filter(Boolean) as string[]),
    [dayBookings],
  );

  const zones = useMemo(() => {
    const map = new Map<string, { name: string; total: number; available: number }>();
    for (const d of desksOnFloor) {
      const z = map.get(d.zone) ?? { name: d.zone, total: 0, available: 0 };
      z.total += 1;
      if (!bookedIds.has(d.id)) z.available += 1;
      map.set(d.zone, z);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [desksOnFloor, bookedIds]);

  const bookZone = (zoneName: string) => {
    const candidate = desksOnFloor.find(
      (d) => d.zone === zoneName && !bookedIds.has(d.id),
    );
    if (!candidate) {
      toast.error("No desks available", { description: `${zoneName} is fully booked.` });
      return;
    }
    addBooking({
      type: "desk",
      deskId: candidate.id,
      date,
      start: "09:00",
      end: "17:30",
      location: `${building.name}, ${userLocation}`,
    });
    toast.success("Desk booked", {
      icon: <CheckCircle2 className="h-4 w-4" />,
      description: `${candidate.number} · ${zoneName} · ${formatDateShort(date)}`,
    });
  };

  return (
    <div className="grid gap-4">
      <div className="glass glass-sheen rounded-[var(--radius-lg)] p-4">
        <h1 className="font-display text-xl font-semibold tracking-tight">Book a desk</h1>
        <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
          {building.name} · {userLocation}
        </p>

        {building.floorIds.length > 1 && (
          <div className="mt-3 flex gap-1.5">
            {building.floorIds.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFloor(f)}
                className={cn(
                  "flex-1 rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--duration-fast)]",
                  floor === f
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "glass-soft text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                )}
              >
                {FLOORS[f].label}
              </button>
            ))}
          </div>
        )}

        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto no-scrollbar px-1 pb-1">
          {dayChips.map((d) => {
            const active = d === date;
            const day = new Date(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={cn(
                  "flex min-w-[56px] flex-col items-center justify-center rounded-[var(--radius-md)] px-2.5 py-2 text-center transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "glass-soft text-[var(--color-fg)] hover:bg-[var(--glass-bg-strong)]",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider",
                    active ? "text-[var(--color-primary-fg)]/85" : "text-[var(--color-fg-muted)]",
                  )}
                >
                  {day.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span className="font-display text-lg font-semibold leading-none mt-0.5">
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="grid gap-2.5">
        {zones.map((z) => {
          const disabled = z.available === 0;
          return (
            <li key={z.name}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => bookZone(z.name)}
                className={cn(
                  "glass glass-sheen rounded-[var(--radius-lg)] w-full p-4 text-left transition-all duration-[var(--duration-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                  disabled
                    ? "opacity-60"
                    : "hover:bg-[var(--glass-bg-strong)] hover:-translate-y-0.5 active:scale-[0.99]",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-soft-fg)] border border-[oklch(0.42_0.13_150_/_0.2)]">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-base font-semibold leading-tight">
                      {z.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                      {z.available} of {z.total} available
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-fg-subtle)]" aria-hidden />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Button asChild variant="ghost" size="sm" className="mx-auto">
        <Link to="/book">
          <MapPin className="h-3 w-3" aria-hidden />
          Switch to map view
        </Link>
      </Button>
    </div>
  );
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
