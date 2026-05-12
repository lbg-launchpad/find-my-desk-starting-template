// Home: contextual greeting, today's booking with check-in/out, reminders.

import { el, toast } from "../components/ui.js";
import {
  getState,
  currentUser,
  todayISO,
  fmtTime,
  fmtDate,
  deskById,
  update,
} from "../store.js";
import { navigate } from "../router.js";
import { LOCATIONS } from "../data.js";
import { getWeather } from "../lib/weather.js";

function greetingFor(hour) {
  if (hour < 5)  return { word: "Working late",   sub: "Office is quiet — take it easy.", bg: "night" };
  if (hour < 12) return { word: "Good morning",   sub: "Hope your day is off to a calm start.", bg: "morning" };
  if (hour < 17) return { word: "Good afternoon", sub: "Halfway there.", bg: "afternoon" };
  if (hour < 21) return { word: "Good evening",   sub: "Wrapping up?", bg: "evening" };
  return { word: "Goodnight",                     sub: "Rest well.", bg: "night" };
}

// --- Full-bleed precipitation overlay ---------------------------------------
// Renders a curtain of falling raindrops / snowflakes (or fog bands, or a
// thunder flash) across the entire hero area. Pure DOM with CSS animations.
function paintPrecip(host, kind) {
  host.replaceChildren();
  host.dataset.kind = kind;
  switch (kind) {
    case "rain":    return spawnRain(host, 36, "drop drop--rain", 0.55, 0.95);
    case "drizzle": return spawnRain(host, 24, "drop drop--drizzle", 1.0, 1.6);
    case "snow":    return spawnSnow(host, 30);
    case "fog":     return spawnFog(host);
    case "storm":   spawnRain(host, 30, "drop drop--rain", 0.5, 0.9); spawnFlash(host); return;
    default:        return; // sun, sun-cloud, cloud, moon: no overlay particles
  }
}

function spawnRain(host, count, cls, minDur, maxDur) {
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const dur = minDur + Math.random() * (maxDur - minDur);
    const delay = -Math.random() * dur;
    const d = el("span", {
      class: cls,
      style: {
        left: `${left}%`,
        animationDuration: `${dur.toFixed(2)}s`,
        animationDelay: `${delay.toFixed(2)}s`,
      },
    });
    host.appendChild(d);
  }
}

function spawnSnow(host, count) {
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const dur = 4 + Math.random() * 4;
    const delay = -Math.random() * dur;
    const size = 6 + Math.floor(Math.random() * 6);
    const sway = (Math.random() * 16 - 8).toFixed(1);
    const f = el("span", {
      class: "flake",
      style: {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${dur.toFixed(2)}s`,
        animationDelay: `${delay.toFixed(2)}s`,
        "--sway": `${sway}px`,
      },
      text: "❄",
    });
    host.appendChild(f);
  }
}

function spawnFog(host) {
  for (let i = 0; i < 5; i++) {
    const top = 15 + i * 16 + Math.random() * 4;
    const dur = 14 + Math.random() * 8;
    const delay = -Math.random() * dur;
    const b = el("span", {
      class: "fog-band",
      style: {
        top: `${top}%`,
        animationDuration: `${dur.toFixed(2)}s`,
        animationDelay: `${delay.toFixed(2)}s`,
      },
    });
    host.appendChild(b);
  }
}

function spawnFlash(host) {
  host.appendChild(el("span", { class: "storm-flash" }));
}

// Build the hero sky scene. timeKind ∈ {morning, afternoon, evening, night}
// drives day/night. weatherKind ∈ {sun, sun-cloud, cloud, fog, drizzle, rain,
// snow, storm} drives the foreground. SVG uses gradient defs so shapes look
// like actual weather illustrations (golden sun on blue, grey clouds, etc).
function skySvg(timeKind, weatherKind = null) {
  const dayMode = timeKind === "morning" || timeKind === "afternoon";
  const kind = weatherKind || (dayMode ? "sun" : "moon");
  return `<svg class="sky-svg" width="160" height="160" viewBox="0 0 120 120" fill="none">
    ${gradientDefs()}
    ${sceneFor(kind, dayMode)}
  </svg>`;
}

function gradientDefs() {
  return `<defs>
    <radialGradient id="sun-disc" cx="50%" cy="45%" r="55%">
      <stop offset="0%"   stop-color="#fff7c2"/>
      <stop offset="55%"  stop-color="#ffd147"/>
      <stop offset="100%" stop-color="#ff9800"/>
    </radialGradient>
    <radialGradient id="sun-halo" cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="#ffe27a" stop-opacity="0.55"/>
      <stop offset="65%"  stop-color="#ffd147" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffd147" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="moon-disc" cx="40%" cy="40%" r="60%">
      <stop offset="0%"   stop-color="#fff8e1"/>
      <stop offset="80%"  stop-color="#e9e1c4"/>
      <stop offset="100%" stop-color="#cabf9a"/>
    </radialGradient>
    <radialGradient id="moon-halo" cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="#fff8e1" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#fff8e1" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cloud-light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#cdd6df"/>
    </linearGradient>
    <linearGradient id="cloud-grey" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#d6dbe2"/>
      <stop offset="100%" stop-color="#7d8693"/>
    </linearGradient>
    <linearGradient id="cloud-storm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#737985"/>
      <stop offset="100%" stop-color="#2c3340"/>
    </linearGradient>
    <linearGradient id="raindrop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#bcd5ee" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#9cc1ee"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#fff6a8"/>
      <stop offset="100%" stop-color="#ffb43d"/>
    </linearGradient>
  </defs>`;
}

function sunLayer() {
  return `
    <g class="sky-sun">
      <circle class="sky-sun__glow"  cx="60" cy="50" r="40" fill="url(#sun-halo)"/>
      <g     class="sky-sun__rays"  style="transform-origin: 60px 50px;">
        ${sunRays(60, 50, 28, 38, 12, "#ffd56b")}
      </g>
      <circle class="sky-sun__core"  cx="60" cy="50" r="22" fill="url(#sun-disc)" stroke="#ffae39" stroke-opacity="0.35"/>
    </g>`;
}

function moonLayer() {
  return `
    <g class="sky-moon">
      <circle class="sky-moon__glow"  cx="76" cy="44" r="34" fill="url(#moon-halo)"/>
      <path   class="sky-moon__shape"
              d="M82 22 a30 30 0 1 0 22 44 a24 24 0 0 1 -22 -44z"
              fill="url(#moon-disc)"/>
      <circle cx="72" cy="60" r="2.4" fill="#a8a08a" opacity="0.45"/>
      <circle cx="86" cy="50" r="1.6" fill="#a8a08a" opacity="0.35"/>
    </g>
    <g class="sky-stars">
      <circle class="sky-star sky-star--a" cx="26" cy="42" r="1.6" fill="#fff"/>
      <circle class="sky-star sky-star--b" cx="40" cy="26" r="1.3" fill="#fff"/>
      <circle class="sky-star sky-star--c" cx="16" cy="68" r="1.1" fill="#fff"/>
      <circle class="sky-star sky-star--d" cx="52" cy="80" r="1"   fill="#fff"/>
    </g>`;
}

function sceneFor(kind, dayMode) {
  // Backdrop body: sun (day) / moon (night). Some conditions hide it.
  const showBody = ["sun", "moon", "sun-cloud", "fog"].includes(kind);
  const body = showBody ? (dayMode ? sunLayer() : moonLayer()) : "";

  switch (kind) {
    case "sun":
    case "moon":
      return body;

    case "sun-cloud":
      return body
        + cloudShape(36, 80, 1.15, "light")
        + cloudShape(86, 72, 0.7, "light", "--b");

    case "cloud":
      return cloudShape(34, 58, 1.15, "light")
        + cloudShape(80, 76, 1.05, "grey", "--b")
        + cloudShape(56, 96, 0.9, "grey", "--c");

    case "fog":
      return body + `
        <g class="sky-fog">
          <rect class="sky-fog__band sky-fog__band--a" x="-20" y="56" width="180" height="8" rx="4" fill="#e6ebf1" opacity="0.55"/>
          <rect class="sky-fog__band sky-fog__band--b" x="-20" y="72" width="180" height="6" rx="3" fill="#e6ebf1" opacity="0.5"/>
          <rect class="sky-fog__band sky-fog__band--c" x="-20" y="86" width="180" height="7" rx="3.5" fill="#e6ebf1" opacity="0.45"/>
          <rect class="sky-fog__band sky-fog__band--d" x="-20" y="100" width="180" height="6" rx="3" fill="#e6ebf1" opacity="0.4"/>
        </g>`;

    case "drizzle":
      return cloudShape(56, 56, 1.4, "grey");

    case "rain":
      return cloudShape(56, 54, 1.5, "grey");

    case "snow":
      return cloudShape(56, 56, 1.4, "light");

    case "storm":
      return cloudShape(58, 54, 1.55, "storm")
        + `<path class="sky-bolt" d="M58 70 L50 92 L62 92 L54 112"
                fill="url(#bolt)" stroke="#ffa726" stroke-width="0.6" stroke-linejoin="round" opacity="0"/>`;

    default:
      return body;
  }
}

function sunRays(cx, cy, r1, r2, count, color = "#ffd56b") {
  let out = "";
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;
    const x2 = cx + Math.cos(angle) * r2;
    const y2 = cy + Math.sin(angle) * r2;
    out += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`;
  }
  return out;
}

function cloudShape(cx, cy, scale = 1, paletteId = "light", modifier = "--a") {
  const fill = paletteId === "grey"  ? "url(#cloud-grey)"
            : paletteId === "storm"  ? "url(#cloud-storm)"
            :                          "url(#cloud-light)";
  const stroke = paletteId === "storm" ? "#1f2530"
              : paletteId === "grey"  ? "#5d6573"
              :                          "#aab1bd";
  return `
    <g class="sky-cloud-shape sky-cloud-shape${modifier}" transform="translate(${cx} ${cy}) scale(${scale})">
      <path d="
        M -22 4
        a 9 9 0 0 1 7 -14
        a 12 12 0 0 1 22 -3
        a 10 10 0 0 1 17 6
        a 8 8 0 0 1 -3 16
        L -19 9
        a 8 8 0 0 1 -3 -5 z"
        fill="${fill}" stroke="${stroke}" stroke-opacity="0.25" stroke-width="1"/>
    </g>`;
}

// Realistic raindrops: small teardrop-ish ellipses, blue gradient.
function rainDrops(xs, yTop, count = 4) {
  let out = "";
  xs.forEach((x, i) => {
    for (let k = 0; k < count; k++) {
      const delay = ((i * 0.13 + k * 0.27) % 1.4).toFixed(2);
      out += `<ellipse class="sky-raindrop" cx="${x}" cy="${yTop}" rx="1.1" ry="3.6" fill="url(#raindrop)" style="animation-delay:-${delay}s"/>`;
    }
  });
  return out;
}

function drizzleDrops(xs, y, scale = 1) {
  let out = "";
  xs.forEach((x, i) => {
    const delay = ((i * 0.18) % 1.6).toFixed(2);
    out += `<ellipse class="sky-drizzle-dot" cx="${x}" cy="${y}" rx="${0.9 * scale}" ry="${2 * scale}" fill="url(#raindrop)" style="animation-delay:-${delay}s"/>`;
  });
  return out;
}

// 6-pointed star snowflakes.
function snowflakeStars(xs, ys, scale = 1) {
  let out = "";
  let i = 0;
  for (const x of xs) {
    for (const y of ys) {
      const delay = ((i++ * 0.21) % 1.8).toFixed(2);
      out += `<g class="sky-snowflake" transform="translate(${x} ${y}) scale(${scale})" style="animation-delay:-${delay}s">
        <line x1="0" y1="-3"  x2="0" y2="3"  stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="-3" y1="0"  x2="3" y2="0"  stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="-2.1" y1="-2.1" x2="2.1" y2="2.1" stroke="#fff" stroke-width="1.0" stroke-linecap="round"/>
        <line x1="-2.1" y1="2.1"  x2="2.1" y2="-2.1" stroke="#fff" stroke-width="1.0" stroke-linecap="round"/>
      </g>`;
    }
  }
  return out;
}

export function HomeView() {
  const root = el("div", { class: "view view--home" });
  const user = currentUser();
  if (!user) return el("div", { class: "empty", text: "Loading…" });

  const now = new Date();
  const greet = greetingFor(now.getHours());

  const skyEl = el("div", { class: "hero__sky", html: skySvg(greet.bg) });
  const precipEl = el("div", { class: "hero__precip", "aria-hidden": "true" });
  const subEl = el("div", { class: "hero__sub", text: greet.sub });
  const timeMode = (greet.bg === "morning" || greet.bg === "afternoon") ? "day" : "night";
  const hero = el("section", {
    class: "hero",
    "aria-label": "Greeting",
    dataset: { time: timeMode, weather: timeMode === "day" ? "sun" : "moon" },
  }, [
    el("div", { class: "hero__bg" }),
    precipEl,
    skyEl,
    el("div", { class: "hero__greet", text: `${greet.word},` }),
    el("div", { class: "hero__name", text: user.name.split(" ")[0] }),
    subEl,
  ]);
  root.appendChild(hero);

  // Live weather: pick the user's effective office for today.
  const today0 = todayISO();
  const todayBooking = getState().bookings.find(
    (b) => b.userId === user.id && b.date === today0 && b.status !== "cancelled",
  );
  const heroLocation = (todayBooking && deskById(todayBooking.deskId)?.locationId)
    || user.preferredLocation
    || user.location;
  if (heroLocation) {
    getWeather(heroLocation, today0).then((w) => {
      if (!w) return;
      hero.dataset.weather = w.kind;
      skyEl.innerHTML = skySvg(greet.bg, w.kind);
      paintPrecip(precipEl, w.kind);
      const temp = (typeof w.tempMax === "number" && typeof w.tempMin === "number")
        ? ` · ${w.tempMax}° / ${w.tempMin}°`
        : (typeof w.tempMax === "number") ? ` · ${w.tempMax}°` : "";
      subEl.textContent = `${w.label} in ${w.locationLabel}${temp}`;
    });
  }

  // Today's booking(s)
  const today = todayISO();
  const myBookings = getState().bookings
    .filter((b) => b.userId === user.id && b.date === today && b.status !== "cancelled")
    .sort((a, b) => a.startMin - b.startMin);

  const todayCard = el("section", { class: "card" }, [
    el("div", { class: "card__title" }, [
      el("h2", { text: "Today" }),
      el("span", { class: "badge", text: fmtDate(today) }),
    ]),
    myBookings.length === 0
      ? el("div", { style: { padding: "8px 0" } }, [
          el("p", { text: "You're not booked in today.", style: { margin: "0 0 12px", color: "var(--c-fg-soft)" } }),
          el("a", { class: "btn", href: "#/book", text: "Book a space" }),
        ])
      : el("div", null, myBookings.map(renderTodayRow)),
  ]);
  root.appendChild(todayCard);

  // 10am desk-bump reminder when not yet checked in
  const needsCheckIn = myBookings.find(
    (b) => !b.checkedIn && b.startMin <= 10 * 60 && (now.getHours() * 60 + now.getMinutes()) < 10 * 60,
  );
  if (needsCheckIn) {
    root.appendChild(el("div", { class: "reminder", style: { marginTop: "12px" } }, [
      el("div", { class: "reminder__dot" }),
      el("div", null, [
        el("div", { style: { fontWeight: 700, marginBottom: "2px" } }, "Check in by 10:00 AM"),
        el("div", { style: { fontSize: "13px", color: "var(--c-fg-soft)" } }, "Desks not checked in by 10am are released automatically. You can check in from this page when you arrive."),
      ]),
    ]));
  }

  // Upcoming bookings (next 7 days, excluding today)
  const horizonEnd = new Date(); horizonEnd.setDate(horizonEnd.getDate() + 14);
  const upcoming = getState().bookings
    .filter((b) => b.userId === user.id && b.status !== "cancelled" && b.date > today && new Date(b.date) <= horizonEnd)
    .sort((a, b) => (a.date + " " + a.startMin).localeCompare(b.date + " " + b.startMin))
    .slice(0, 4);
  if (upcoming.length) {
    const card = el("section", { class: "card", style: { marginTop: "12px" } }, [
      el("div", { class: "card__title" }, [
        el("h2", { text: "Upcoming" }),
        el("a", { class: "badge", href: "#/bookings", text: "View all" }),
      ]),
      el("div", null, upcoming.map((b) => {
        const desk = deskById(b.deskId);
        const loc = LOCATIONS.find((l) => l.id === desk?.locationId)?.name || "";
        return el("div", { class: "row" }, [
          el("div", { class: "row__main" }, [
            el("div", { class: "row__title", text: `Desk ${desk?.number || "?"} • ${desk?.zone || ""}` }),
            el("div", { class: "row__sub", text: `${fmtDate(b.date)} • ${fmtTime(b.startMin)}–${fmtTime(b.endMin)} • ${loc}` }),
          ]),
        ]);
      })),
    ]);
    root.appendChild(card);
  }

  // Office occupancy forecast — next 7 days at the user's preferred office
  root.appendChild(buildOccupancyCard(user));

  // Carbon savings — kg CO2 saved this month from remote/off days
  root.appendChild(buildCarbonCard(user));

  // Quick actions
  root.appendChild(el("div", { class: "section-h", text: "Quick actions" }));
  root.appendChild(el("div", { class: "grid-2" }, [
    quickLink("Book a desk", "#/book", `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>`),
    quickLink("My team", "#/team", `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`),
    quickLink("Wayfinder", "#/wayfinder", `<path d="M9 20l-6-6 6-6M9 14h12"/>`),
    quickLink("Profile", "#/profile", `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`),
  ]));

  return root;
}

function renderTodayRow(b) {
  const desk = deskById(b.deskId);
  const checkedIn = b.checkedIn;
  const loc = LOCATIONS.find((l) => l.id === desk?.locationId)?.name || "";
  const floorLabel = desk?.floorId === "ground" ? "Ground floor" : "First floor";

  return el("div", { class: "today" }, [
    // Headline row: big desk number + status pill
    el("div", { class: "today__head" }, [
      el("div", { class: "today__deskbox" }, [
        el("div", { class: "today__deskbox__label", text: "Your desk today" }),
        el("div", { class: "today__deskbox__number", text: desk?.number || "?" }),
      ]),
      el("span", {
        class: "today__status",
        "data-state": checkedIn ? "in" : "pending",
        text: checkedIn ? "Checked in" : "Not checked in",
      }),
    ]),

    // Meta block: zone, time, location
    el("div", { class: "today__meta-grid" }, [
      todayMeta("Zone",     desk?.zone || "—"),
      todayMeta("Time",     `${fmtTime(b.startMin)} – ${fmtTime(b.endMin)}`),
      todayMeta("Building", loc ? `${loc} · ${floorLabel}` : floorLabel),
    ]),

    // Actions row
    el("div", { class: "today__actions" }, [
      checkedIn
        ? el("button", { class: "btn btn--ghost btn--sm", onclick: () => doCheckOut(b.id) }, "Check out")
        : el("button", { class: "btn btn--sm", onclick: () => doCheckIn(b.id) }, "Check in"),
      el("a", { class: "btn btn--ghost btn--sm", href: "#/wayfinder" }, [
        el("span", { html: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 7 8 12 8 12s8-5 8-12a8 8 0 0 0-8-8z"/></svg>` }),
        "Find my desk",
      ]),
      el("a", { class: "btn btn--ghost btn--sm", href: "#/bookings" }, "Manage"),
    ]),
  ]);
}


function todayMeta(label, value) {
  return el("div", { class: "today__meta-cell" }, [
    el("div", { class: "today__meta-cell__label", text: label }),
    el("div", { class: "today__meta-cell__value", text: value }),
  ]);
}

function doCheckIn(bookingId) {
  update((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (b) b.checkedIn = true;
  });
  toast("Checked in — have a great day", "success");
  navigate();
}

function doCheckOut(bookingId) {
  update((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (b) b.checkedIn = false;
  });
  toast("Checked out — desk released for the rest of the slot", "default");
  navigate();
}

function quickLink(label, href, svgPath) {
  return el("a", {
    class: "card",
    href,
    style: { display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" },
  }, [
    el("span", {
      style: { width: "40px", height: "40px", borderRadius: "12px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--c-brand-soft)", color: "var(--c-brand)" },
      html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`,
    }),
    el("div", null, [
      el("div", { style: { fontWeight: 600, fontSize: "14px" } }, label),
      el("div", { style: { fontSize: "12px", color: "var(--c-fg-muted)" } }, "Open"),
    ]),
  ]);
}

// --- Office occupancy forecast ---------------------------------------------
// 7-day bar chart of how full the user's office is. Click a bar to jump to
// /book with that date pre-filled.

function buildOccupancyCard(user) {
  const locationId = user.preferredLocation || user.location || "london";
  const locationLabel = LOCATIONS.find((l) => l.id === locationId)?.name || locationId;
  const totalDesks = getState().desks.filter((d) => d.locationId === locationId).length || 1;

  // Next 7 days starting today.
  const today = todayISO();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const desk = getState().desks.filter((dk) => dk.locationId === locationId);
    const deskIds = new Set(desk.map((dk) => dk.id));
    const bookings = getState().bookings.filter(
      (b) => b.date === iso && b.status !== "cancelled" && deskIds.has(b.deskId),
    );
    days.push({ iso, dow: d, count: bookings.length });
  }
  const max = Math.max(1, ...days.map((d) => d.count), Math.round(totalDesks * 0.4));

  const card = el("section", { class: "card", style: { marginTop: "12px" } });
  card.appendChild(el("div", { class: "card__title" }, [
    el("h2", { text: "Office occupancy" }),
    el("span", { class: "badge", text: locationLabel }),
  ]));
  card.appendChild(el("p", {
    style: { fontSize: "12px", color: "var(--c-fg-muted)", margin: "0 0 12px" },
    text: "How busy your office looks for the week. Tap a day to book.",
  }));

  const chart = el("div", { class: "occu" });
  for (const d of days) {
    const ratio = Math.min(1, d.count / max);
    const isToday = d.iso === today;
    const dayLabel = d.dow.toLocaleDateString(undefined, { weekday: "short" });
    const num = d.dow.getDate();
    const pct = Math.round((d.count / totalDesks) * 100);
    const heat = ratio > 0.75 ? "high" : ratio > 0.4 ? "mid" : "low";

    chart.appendChild(el("a", {
      class: "occu__col",
      "data-today": isToday ? "1" : null,
      "data-heat": heat,
      href: `#/book?date=${d.iso}`,
    }, [
      el("span", { class: "occu__bar-wrap" }, [
        el("span", {
          class: "occu__bar",
          style: { height: `${Math.max(6, ratio * 100)}%` },
        }),
      ]),
      el("span", { class: "occu__pct", text: `${pct}%` }),
      el("span", { class: "occu__dow", text: dayLabel }),
      el("span", { class: "occu__num", text: String(num) }),
    ]));
  }
  card.appendChild(chart);
  return card;
}

// --- Carbon savings widget --------------------------------------------------
// Estimates kg CO2 avoided this month using the user's working pattern.
// 16 km round-trip commute, 0.17 kg CO2 per km (UK avg petrol car).

function buildCarbonCard(user) {
  const KG_PER_DAY = 16 * 0.17; // ≈ 2.72 kg
  const wp = user.workingPattern || {};

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const weekdayKey = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  let remoteDays = 0;
  let officeDays = 0;
  let totalWeekdays = 0;
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    totalWeekdays++;
    const pattern = wp[weekdayKey[dow]] || "office";
    if (pattern === "remote" || pattern === "off") remoteDays++;
    else officeDays++;
  }
  const kgSaved = remoteDays * KG_PER_DAY;
  // 21 kg CO2 ≈ 1 tree-day equivalent (very rough). Use this purely for vibes.
  const trees = Math.max(0, Math.round((kgSaved / 21) * 10) / 10);

  const monthName = now.toLocaleDateString(undefined, { month: "long" });

  const card = el("section", { class: "card", style: { marginTop: "12px" } });
  card.appendChild(el("div", { class: "card__title" }, [
    el("h2", { text: "Your carbon savings" }),
    el("span", { class: "badge", text: monthName }),
  ]));

  card.appendChild(el("div", { class: "carbon" }, [
    el("div", { class: "carbon__big" }, [
      el("span", { class: "carbon__num", text: kgSaved.toFixed(1) }),
      el("span", { class: "carbon__unit", text: "kg CO₂e" }),
    ]),
    el("div", { class: "carbon__sub" }, [
      el("span", null, [
        "Saved this month from ",
        el("strong", { text: `${remoteDays} remote / off` }),
        " day", remoteDays === 1 ? "" : "s",
        ` of ${totalWeekdays} weekdays.`,
      ]),
      el("span", { class: "carbon__eco", text: `≈ ${trees} tree-day${trees === 1 ? "" : "s"} of CO₂ uptake 🌱` }),
    ]),
  ]));

  // Tiny bar showing remote vs office split for the month
  const totalWorkdays = remoteDays + officeDays || 1;
  card.appendChild(el("div", { class: "carbon__split", "aria-hidden": "true" }, [
    el("span", { class: "carbon__split__office", style: { flex: officeDays || 0.0001 } }),
    el("span", { class: "carbon__split__remote", style: { flex: remoteDays || 0.0001 } }),
  ]));
  card.appendChild(el("div", { class: "carbon__legend" }, [
    el("span", null, [el("span", { class: "dot dot--office" }), ` Office: ${officeDays} day${officeDays === 1 ? "" : "s"}`]),
    el("span", null, [el("span", { class: "dot dot--remote" }), ` Remote: ${remoteDays} day${remoteDays === 1 ? "" : "s"}`]),
  ]));
  card.appendChild(el("p", {
    style: { fontSize: "11px", color: "var(--c-fg-muted)", margin: "10px 0 0" },
    text: "Based on a 10-mile (16 km) round-trip car commute and 0.17 kg CO₂/km — UK average. Edit your working pattern on Profile to tune the estimate.",
  }));
  return card;
}
