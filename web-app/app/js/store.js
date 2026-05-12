// Central app store. Keeps mutable runtime state, exposes pure-ish helpers,
// and persists user-facing slices (bookings, preferences, theme) to localStorage.

import { loadState, saveState } from "./data.js";

const listeners = new Set();

export const TIME_SLOTS = {
  day:       { label: "All day",    startMin: 9 * 60,  endMin: 17 * 60 + 30 },
  morning:   { label: "Morning",    startMin: 9 * 60,  endMin: 12 * 60 + 30 },
  afternoon: { label: "Afternoon",  startMin: 13 * 60, endMin: 17 * 60 + 30 },
  custom:    { label: "Custom",     startMin: 10 * 60, endMin: 15 * 60 },
};

const state = {
  // hydrated
  ...loadState(),
  // runtime only
  users: [],
  desks: [],
  // booking flow scratch state
  bookingDraft: {
    locationId: null,
    floorId: "ground",
    date: todayISO(),
    slotKey: "day",
    customStart: TIME_SLOTS.custom.startMin,
    customEnd: TIME_SLOTS.custom.endMin,
    selectedDeskId: null,
    forTeam: false,
    teammates: [], // user ids
    teamDeskMap: {}, // userId -> deskId
    amenityFilters: [],
  },
};

export function getState() { return state; }

function deriveInitials(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();
}

// Apply user-editable overrides (from state.preferences) onto the base Workday
// user record so views read one consistent shape. Identity/HR fields (id, email,
// team, role, manager, location) are left untouched.
function applyProfileOverrides(base) {
  if (!base) return base;
  const p = state.preferences || {};
  const display = (p.displayName || "").trim();
  const name = display || base.name;
  const hasAnchorOverride = Array.isArray(p.anchorDays) && p.anchorDays.length > 0;
  const hasPatternOverride = p.workingPattern && Object.keys(p.workingPattern).length > 0;
  return {
    ...base,
    name,
    initials: display ? deriveInitials(name) : base.initials,
    pronouns: p.pronouns || "",
    phone: p.phone || "",
    avatarDataUrl: p.avatarDataUrl || "",
    anchorDays: hasAnchorOverride ? p.anchorDays : (base.workdayAnchorDays || []),
    workingPattern: hasPatternOverride ? p.workingPattern : (base.workdayWorkingPattern || {}),
    preferredLocation: p.preferredLocation || base.location,
    // PA toggle only takes effect when Workday says they're a PA.
    isPA: !!base.workdayIsPA && !!p.isPA,
  };
}

export function currentUser() {
  const base = state.users.find((u) => u.id === state.currentUserId) || state.users[0] || null;
  return applyProfileOverrides(base);
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

export function hydrate({ users, desks }) {
  state.users = users;
  state.desks = desks;
  if (!state.currentUserId && users.length) {
    state.currentUserId = users[0].id;
    state.bookingDraft.locationId = users[0].location;
    state.lastLocation = users[0].location;
  }
  if (!state.bookingDraft.locationId) state.bookingDraft.locationId = state.lastLocation || "london";
  // Migrate: clear stale Teams/Workday SVG mock avatars from older builds so
  // the initials circle can show again. Real uploads (jpeg/png/webp data URLs)
  // are preserved.
  if (state.preferences?.avatarDataUrl &&
      state.preferences.avatarDataUrl.startsWith("data:image/svg+xml")) {
    state.preferences.avatarDataUrl = "";
  }
  seedDemo();
  persist();
}

// One-off demo seed: gives the user a booking today + populates the next 7
// days with realistic per-weekday occupancy across every office so the
// occupancy chart, floor map and team views all have data to show.
//
// Versioned key — bumping the suffix forces a re-seed for existing localStorage.
const SEED_KEY = "spaces-lbg-seeded-v3";

// Target occupancy ratios per day-of-week (Sun=0 ... Sat=6). Tuesday peaks.
const DOW_OCCUPANCY = [0.05, 0.62, 0.86, 0.74, 0.55, 0.32, 0.08];

function seedDemo() {
  if (localStorage.getItem(SEED_KEY) === "1") return;

  // Drop any prior seed bookings (from older versions of this function).
  state.bookings = state.bookings.filter(
    (b) => !(typeof b.id === "string" && b.id.startsWith("seed-")),
  );

  const me = state.users.find((u) => u.id === state.currentUserId);
  if (!me) { localStorage.setItem(SEED_KEY, "1"); return; }

  const today = todayISO();
  let n = 0;

  // 1) Always give "me" a booking today (preserves the previous demo behaviour).
  const myDesks = state.desks.filter((d) => d.locationId === me.location && d.floorId === "ground");
  if (myDesks.length) {
    state.bookings.push({
      id: `seed-me-${n++}`,
      userId: me.id,
      deskId: myDesks[2].id,
      date: today,
      startMin: 9 * 60,
      endMin: 12 * 60 + 30,
      label: "Morning",
      checkedIn: false,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    });
  }

  // 2) Realistic bookings at every office for the next 7 days.
  const locationIds = [...new Set(state.desks.map((d) => d.locationId))];
  const otherUsers = state.users.filter((u) => u.id !== me.id);

  for (let i = 0; i < 7; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const occu = DOW_OCCUPANCY[dow] ?? 0.5;

    for (const locId of locationIds) {
      const desksHere = state.desks.filter((dk) => dk.locationId === locId);
      const target = Math.max(0, Math.round(desksHere.length * occu));
      if (target === 0) continue;

      // Deterministic-ish shuffle so reseeds look similar across reloads.
      const desks = shuffleSeeded(desksHere, hash32(`${SEED_KEY}-${iso}-${locId}-d`));
      const users = shuffleSeeded(otherUsers,   hash32(`${SEED_KEY}-${iso}-${locId}-u`));

      const lim = Math.min(target, desks.length, users.length);
      for (let j = 0; j < lim; j++) {
        const user = users[j];
        const desk = desks[j];
        // Skip if this user is already booked elsewhere today (avoid duplicates).
        if (state.bookings.some((b) => b.userId === user.id && b.date === iso)) continue;
        state.bookings.push({
          id: `seed-${iso}-${n++}`,
          userId: user.id,
          deskId: desk.id,
          date: iso,
          startMin: 9 * 60,
          endMin: 17 * 60 + 30,
          label: "All day",
          checkedIn: i === 0 && j % 3 === 0,
          status: "confirmed",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  localStorage.setItem(SEED_KEY, "1");
}

// Tiny seeded shuffle + 32-bit hash so seed output is stable per (date, loc).
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSeeded(arr, seed) {
  const out = [...arr];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function persist() {
  saveState({
    currentUserId: state.currentUserId,
    theme: state.theme,
    bookings: state.bookings,
    preferences: state.preferences,
    lastLocation: state.lastLocation,
  });
}

export function update(mutator) {
  mutator(state);
  persist();
  notify();
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function fmtTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m === 0 ? "" : ":" + String(m).padStart(2, "0")}${ampm}`;
}

export function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function deskById(id) { return state.desks.find((d) => d.id === id); }
export function userById(id) { return state.users.find((u) => u.id === id); }

// Bookings that overlap a given date+time range on a specific desk
export function bookingsOnDesk(deskId, date) {
  return state.bookings.filter((b) => b.deskId === deskId && b.date === date && b.status !== "cancelled");
}

export function deskOccupantOn(deskId, date) {
  const booking = bookingsOnDesk(deskId, date)[0];
  if (!booking) return null;
  return userById(booking.userId);
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function deskIsFreeFor({ deskId, date, startMin, endMin }) {
  return !state.bookings.some(
    (b) =>
      b.deskId === deskId &&
      b.date === date &&
      b.status !== "cancelled" &&
      rangesOverlap(b.startMin, b.endMin, startMin, endMin)
  );
}

export function genBookingId() {
  return "bk-" + Math.random().toString(36).slice(2, 9);
}
