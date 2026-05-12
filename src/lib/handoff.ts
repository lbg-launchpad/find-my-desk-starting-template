// Demo-only desktop → phone hand-off.
// A real implementation would mint a one-time token on the server and
// store the session on the device after a single-use exchange. Here we
// just embed the user id and a timestamp so the prototype can show the
// same demo user on both surfaces. The token is throwaway — there is no
// authentication in this prototype.

const TOKEN_TTL_MS = 5 * 60 * 1000;

export function buildHandoffUrl(userId: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const t = Date.now();
  const params = new URLSearchParams({ u: userId, t: String(t) });
  return `${base}/mobile/handoff?${params.toString()}`;
}

export function parseHandoffParams(search: Record<string, unknown>): {
  userId: string | null;
  fresh: boolean;
} {
  const userId = typeof search.u === "string" ? search.u : null;
  const tStr = typeof search.t === "string" ? search.t : null;
  const t = tStr ? Number(tStr) : NaN;
  const fresh = Number.isFinite(t) && Date.now() - t < TOKEN_TTL_MS;
  return { userId, fresh };
}
