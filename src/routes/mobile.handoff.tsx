import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Smartphone } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { USER_BY_ID } from "@/data/app";
import { Button } from "@/components/ui/button";
import { parseHandoffParams } from "@/lib/handoff";

export const Route = createFileRoute("/mobile/handoff")({
  validateSearch: (s) => s as Record<string, unknown>,
  component: HandoffPage,
});

type Status = "verifying" | "ok" | "expired" | "unknown-user";

function HandoffPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { setCurrentUser, user } = useAppStore();
  const [status, setStatus] = useState<Status>("verifying");
  const [matchedName, setMatchedName] = useState<string | null>(null);

  useEffect(() => {
    const { userId, fresh } = parseHandoffParams(search);
    if (!userId || !USER_BY_ID[userId]) {
      setStatus("unknown-user");
      return;
    }
    if (!fresh) {
      setStatus("expired");
      return;
    }
    setMatchedName(USER_BY_ID[userId]!.fullName);
    setCurrentUser(userId);
    setStatus("ok");
    const id = setTimeout(() => {
      navigate({ to: "/mobile" });
    }, 1100);
    return () => clearTimeout(id);
  }, [search, setCurrentUser, navigate]);

  return (
    <div className="grid min-h-[80dvh] place-items-center px-2">
      <div className="glass-pop glass-sheen rounded-[var(--radius-xl)] p-6 w-full max-w-sm text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-soft-fg)] border border-[oklch(0.42_0.13_150_/_0.2)]">
          <Smartphone className="h-6 w-6" aria-hidden />
        </div>

        {status === "verifying" && (
          <>
            <h1 className="mt-4 font-display text-xl font-semibold tracking-tight">
              Verifying hand-off…
            </h1>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Pairing this phone with your desktop session.
            </p>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="mt-4 inline-flex items-center gap-2 text-[var(--color-success)]">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              <span className="text-sm font-medium">Paired</span>
            </div>
            <h1 className="mt-2 font-display text-xl font-semibold tracking-tight">
              Welcome, {matchedName ?? user.fullName}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Taking you to your mobile dashboard…
            </p>
          </>
        )}

        {status === "expired" && (
          <>
            <div className="mt-4 inline-flex items-center gap-2 text-[var(--color-warning)]">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              <span className="text-sm font-medium">Code expired</span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Hand-off codes are valid for 5 minutes. Generate a fresh QR on your desktop.
            </p>
            <Button onClick={() => navigate({ to: "/mobile" })} className="mt-4 w-full" size="lg">
              Continue anyway
            </Button>
          </>
        )}

        {status === "unknown-user" && (
          <>
            <div className="mt-4 inline-flex items-center gap-2 text-[var(--color-danger)]">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              <span className="text-sm font-medium">Unknown link</span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              We couldn't recognise this hand-off code. Try scanning the QR again.
            </p>
            <Button onClick={() => navigate({ to: "/mobile" })} className="mt-4 w-full" size="lg">
              Open mobile dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
