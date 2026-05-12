import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarCheck, Building2 } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { to: "/mobile", label: "Home", icon: Home, match: (p: string) => p === "/mobile" },
  { to: "/mobile/book", label: "Book", icon: Building2, match: (p: string) => p.startsWith("/mobile/book") },
  { to: "/mobile/bookings", label: "Bookings", icon: CalendarCheck, match: (p: string) => p.startsWith("/mobile/bookings") },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[416px] pb-[max(env(safe-area-inset-bottom),0px)]"
    >
      <div className="glass-pop glass-sheen rounded-[var(--radius-pill)] px-1.5 py-1.5">
        <ul className="flex items-center justify-around gap-0.5">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = it.match(pathname);
            return (
              <li key={it.to} className="flex-1">
                <Link
                  to={it.to}
                  className={cn(
                    "group flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-pill)] py-2 px-2 text-[10px] font-medium transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                    active
                      ? "text-[var(--color-primary-fg)] bg-[var(--color-primary)] shadow-[0_6px_14px_-6px_oklch(0.42_0.13_150_/_0.6)]"
                      : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--glass-bg-soft)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-[var(--duration-fast)]",
                      active && "scale-105",
                    )}
                    aria-hidden
                  />
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
