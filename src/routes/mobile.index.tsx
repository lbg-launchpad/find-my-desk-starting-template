import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPin,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useNow, greetingFor } from "@/lib/use-now";
import { Button } from "@/components/ui/button";
import { DESK_BY_ID, FLOORS } from "@/data/desks";

export const Route = createFileRoute("/mobile/")({
  component: MobileHome,
});

function MobileHome() {
  const { user, myBookingForToday, checkIn, checkOut } = useAppStore();
  const now = useNow(30_000);
  const firstName = user.fullName.split(" ")[0] ?? user.fullName;
  const greeting = greetingFor(now, firstName);
  const booking = myBookingForToday();
  const desk = booking?.deskId ? DESK_BY_ID[booking.deskId] : undefined;
  const floor = desk ? FLOORS[desk.floor] : undefined;
  const checkedIn = !!booking?.checkedInAt;
  const checkedOut = !!booking?.checkedOutAt;

  const handleCheckIn = () => {
    if (!booking) return;
    checkIn(booking.id);
    toast.success("Checked in", { icon: <LogIn className="h-4 w-4" /> });
  };
  const handleCheckOut = () => {
    if (!booking) return;
    checkOut(booking.id);
    toast.success("Checked out", { icon: <LogOut className="h-4 w-4" /> });
  };

  return (
    <div className="grid gap-4">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="glass-pop glass-sheen rounded-[var(--radius-xl)] p-5"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">
          {greeting.text}.
        </h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {booking ? "Here's where you're working today." : "You have no desk booked today."}
        </p>

        {booking && desk && floor && (
          <div className="mt-4 rounded-[var(--radius-lg)] glass glass-sheen p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
                  Today's desk
                </p>
                <p className="font-display text-2xl font-semibold leading-none mt-0.5">
                  {desk.number}
                </p>
              </div>
              <div className="text-right text-xs text-[var(--color-fg-muted)]">
                <p>{booking.start}–{booking.end}</p>
                <p>{floor.label}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)]">
              <MapPin className="h-3 w-3" aria-hidden />
              <span>{desk.zone}</span>
            </div>

            <div className="mt-4">
              {!checkedIn && (
                <Button onClick={handleCheckIn} className="w-full" size="lg">
                  <LogIn className="h-4 w-4" aria-hidden />
                  Check in
                </Button>
              )}
              {checkedIn && !checkedOut && (
                <Button onClick={handleCheckOut} variant="secondary" className="w-full" size="lg">
                  <LogOut className="h-4 w-4" aria-hidden />
                  Check out
                </Button>
              )}
              {checkedOut && (
                <div className="flex items-center justify-center gap-2 rounded-[var(--radius-pill)] py-2 text-sm text-[var(--color-success)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  All done for today
                </div>
              )}
            </div>
          </div>
        )}

        {!booking && (
          <div className="mt-4">
            <Button asChild className="w-full" size="lg">
              <Link to="/mobile/book">
                <Building2 className="h-4 w-4" aria-hidden />
                Book a desk
              </Link>
            </Button>
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          to="/mobile/book"
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title="Book a desk"
          subtitle="Next 7 days"
        />
        <QuickAction
          to="/mobile/bookings"
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          title="My bookings"
          subtitle="Upcoming & past"
        />
      </div>

      <p className="text-center text-[11px] text-[var(--color-fg-subtle)] mt-2">
        Mobile preview · paired with desktop session
      </p>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="group glass glass-sheen rounded-[var(--radius-lg)] p-4 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:bg-[var(--glass-bg-strong)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      <div className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-soft-fg)] border border-[oklch(0.42_0.13_150_/_0.2)]">
        {icon}
      </div>
      <div className="mt-2.5 font-display text-base font-semibold leading-tight">{title}</div>
      <div className="text-xs text-[var(--color-fg-muted)]">{subtitle}</div>
    </Link>
  );
}
