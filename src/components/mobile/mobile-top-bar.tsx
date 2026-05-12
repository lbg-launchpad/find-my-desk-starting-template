import { Link } from "@tanstack/react-router";
import { Smartphone, Sun, Moon } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { Avatar } from "@/components/ui/avatar";

export function MobileTopBar() {
  const { user, state, updatePreferences } = useAppStore();
  const dark = state.preferences.theme === "dark";

  return (
    <header className="sticky top-0 z-20 w-full pt-[max(env(safe-area-inset-top),0px)]">
      <div className="mx-3 mt-3 rounded-[var(--radius-pill)] glass-pop glass-sheen flex h-12 items-center justify-between pl-2 pr-2">
        <Link
          to="/mobile"
          className="flex items-center gap-2 rounded-[var(--radius-pill)] px-2 py-1 font-display text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-primary-fg)] shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.4)]"
            style={{ background: "var(--color-primary)" }}
            aria-hidden
          >
            <Smartphone className="h-3.5 w-3.5" />
          </span>
          <span className="leading-none">
            Spaces<span className="text-[var(--color-primary)]">@LBG</span>
            <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
              Mobile
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => updatePreferences({ theme: dark ? "light" : "dark" })}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] text-[var(--color-fg-muted)] hover:bg-[var(--glass-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          </button>
          <Avatar initials={user.initials} name={user.fullName} size={32} />
        </div>
      </div>
    </header>
  );
}
