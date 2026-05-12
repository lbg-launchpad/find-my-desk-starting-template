import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2,
  CalendarCheck,
  LogIn,
  LogOut,
  XCircle,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, todayISO } from "@/lib/app-store";
import { DESK_BY_ID, FLOORS } from "@/data/desks";
import type { Booking } from "@/lib/app-store";

export const Route = createFileRoute("/mobile/bookings")({
  component: MobileBookings,
});

function MobileBookings() {
  const { bookingsForUser, cancelBooking, checkIn, checkOut } = useAppStore();
  const today = todayISO();
  const mine = bookingsForUser().slice().sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = mine.filter((b) => b.date >= today);
  const past = mine.filter((b) => b.date < today);

  return (
    <div className="grid gap-4">
      <div className="glass glass-sheen rounded-[var(--radius-lg)] p-4">
        <h1 className="font-display text-xl font-semibold tracking-tight">My bookings</h1>
        <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
          {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      <Section title="Upcoming" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <EmptyState
            message="Nothing booked yet."
            action={
              <Button asChild size="sm">
                <Link to="/mobile/book">
                  <Building2 className="h-4 w-4" aria-hidden />
                  Book a desk
                </Link>
              </Button>
            }
          />
        ) : (
          upcoming.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              isToday={b.date === today}
              onCheckIn={() => {
                checkIn(b.id);
                toast.success("Checked in", { icon: <LogIn className="h-4 w-4" /> });
              }}
              onCheckOut={() => {
                checkOut(b.id);
                toast.success("Checked out", { icon: <LogOut className="h-4 w-4" /> });
              }}
              onCancel={() => {
                cancelBooking(b.id);
                toast("Booking cancelled");
              }}
            />
          ))
        )}
      </Section>

      {past.length > 0 && (
        <Section title="Past" count={past.length}>
          {past.slice(-5).reverse().map((b) => (
            <BookingRow key={b.id} booking={b} isToday={false} muted />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
          {count}
        </span>
      </div>
      <ul className="grid gap-2.5">{children}</ul>
    </section>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <li className="glass-soft rounded-[var(--radius-lg)] p-6 text-center">
      <CalendarCheck className="mx-auto h-6 w-6 text-[var(--color-fg-subtle)]" aria-hidden />
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{message}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </li>
  );
}

function BookingRow({
  booking,
  isToday,
  muted,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  booking: Booking;
  isToday: boolean;
  muted?: boolean;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onCancel?: () => void;
}) {
  const desk = booking.deskId ? DESK_BY_ID[booking.deskId] : undefined;
  const floor = desk ? FLOORS[desk.floor] : undefined;
  const checkedIn = !!booking.checkedInAt;
  const checkedOut = !!booking.checkedOutAt;
  const dateLabel = new Date(booking.date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <li
      className={`glass glass-sheen rounded-[var(--radius-lg)] p-4 ${muted ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
            {isToday ? "Today" : dateLabel}
          </p>
          <p className="font-display text-lg font-semibold leading-tight mt-0.5">
            {desk?.number ?? booking.type}
          </p>
          {desk && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-fg-muted)]">
              <MapPin className="h-3 w-3" aria-hidden />
              {desk.zone} · {floor?.label}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-[var(--color-fg-muted)]">
          {booking.start}–{booking.end}
        </div>
      </div>

      {isToday && (
        <div className="mt-3 flex gap-2">
          {!checkedIn && onCheckIn && (
            <Button onClick={onCheckIn} size="sm" className="flex-1">
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Check in
            </Button>
          )}
          {checkedIn && !checkedOut && onCheckOut && (
            <Button onClick={onCheckOut} variant="secondary" size="sm" className="flex-1">
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Check out
            </Button>
          )}
          {onCancel && !checkedIn && (
            <Button onClick={onCancel} variant="ghost" size="sm">
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              Cancel
            </Button>
          )}
        </div>
      )}
      {!isToday && onCancel && (
        <div className="mt-3 flex">
          <Button onClick={onCancel} variant="ghost" size="sm">
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}
