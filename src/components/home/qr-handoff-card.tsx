import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { buildHandoffUrl } from "@/lib/handoff";

const REFRESH_MS = 4 * 60 * 1000;

export function QrHandoffCard() {
  const { user, state } = useAppStore();
  const dark = state.preferences.theme === "dark";
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generate = useCallback(async () => {
    const next = buildHandoffUrl(user.id);
    setUrl(next);
    const png = await QRCode.toDataURL(next, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: dark
        ? { dark: "#f6f6f6ff", light: "#00000000" }
        : { dark: "#1a1a1aff", light: "#00000000" },
    });
    setDataUrl(png);
    setGeneratedAt(new Date());
  }, [user.id, dark]);

  useEffect(() => {
    void generate();
    const id = setInterval(() => void generate(), REFRESH_MS);
    return () => clearInterval(id);
  }, [generate]);

  return (
    <section
      aria-label="Open on your phone"
      className="hidden md:block glass-pop glass-sheen rounded-[var(--radius-xl)] p-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-soft-fg)] border border-[oklch(0.42_0.13_150_/_0.2)]">
            <Smartphone className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">
            Continue on your phone
          </h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Scan this QR code with your phone's camera to open the Spaces@LBG
            mobile companion on this device.
          </p>
          <ul className="mt-3 grid gap-1 text-xs text-[var(--color-fg-muted)]">
            <li>· Codes expire after 5 minutes for safety.</li>
            <li>· Same demo user opens on both surfaces.</li>
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => void generate()} variant="secondary" size="sm">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              New code
            </Button>
            {generatedAt && (
              <span className="text-[10px] text-[var(--color-fg-subtle)]">
                Refreshed {generatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <div className="rounded-[var(--radius-lg)] glass-strong p-3">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR code linking to ${url}`}
                width={156}
                height={156}
                className="block h-[156px] w-[156px]"
              />
            ) : (
              <div className="grid h-[156px] w-[156px] place-items-center text-xs text-[var(--color-fg-muted)]">
                Generating…
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
