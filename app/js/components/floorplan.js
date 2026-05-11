// Interactive floor plan with selectable dots, pan/zoom, arrow nav.
// Renders desk dots over the chosen floor image. Tap a dot → popup.

import { el, icon, clear } from "./ui.js";
import {
  AMENITIES,
  FLOORS,
} from "../data.js";
import {
  getState,
  bookingsOnDesk,
  deskOccupantOn,
  currentUser,
  update,
} from "../store.js";

const NATIVE_W = 1600; // virtual logical width — desk x/y are stored as 0..1
const NATIVE_H = 1000;

export function FloorPlan({ onSelect, onTeamPickFor, filterAmenities, bookingDateProvider, selectedDeskIdProvider }) {
  const root = el("div", { class: "floorplan" });

  const stage = el("div", { class: "floorplan__stage" });
  const inner = el("div", { class: "floorplan__inner" });
  const img = el("img", { class: "floorplan__img", alt: "Floor plan", draggable: "false" });
  inner.appendChild(img);
  stage.appendChild(inner);
  root.appendChild(stage);

  // Floor switcher (above stage)
  const switcher = el("div", { class: "floor-switcher", role: "tablist", "aria-label": "Floor" });
  for (const f of FLOORS) {
    switcher.appendChild(el("button", {
      type: "button",
      role: "tab",
      "aria-pressed": "false",
      "data-floor": f.id,
      onclick: () => setFloor(f.id),
      text: f.name,
    }));
  }

  // Controls (zoom + arrow nav)
  const controls = el("div", { class: "floorplan__controls" });
  const mkCtrl = (label, svgPath, on) => el("button", {
    class: "floorplan__ctrl", "aria-label": label, onclick: on,
    html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`,
  });
  controls.append(
    mkCtrl("Zoom in",     `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>`, () => zoomBy(1.25)),
    mkCtrl("Zoom out",    `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>`,         () => zoomBy(0.8)),
    mkCtrl("Fit to screen",`<path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/>`,                         () => fitToScreen()),
    mkCtrl("Pan left",    `<path d="M15 18l-6-6 6-6"/>`,  () => panBy(-120, 0)),
    mkCtrl("Pan right",   `<path d="M9 18l6-6-6-6"/>`,    () => panBy(120, 0)),
    mkCtrl("Pan up",      `<path d="M18 15l-6-6-6 6"/>`,  () => panBy(0, -120)),
    mkCtrl("Pan down",    `<path d="M6 9l6 6 6-6"/>`,     () => panBy(0, 120)),
  );
  stage.appendChild(controls);

  // Legend
  const legend = el("div", { class: "floorplan__legend" });
  const legendItem = (color, label) => el("span", { class: "legend-item" }, [
    el("span", { class: "legend-dot", style: { background: color } }),
    el("span", { text: label }),
  ]);
  legend.append(
    legendItem("var(--desk-available)", "Available"),
    legendItem("var(--desk-booked)",    "Booked"),
    legendItem("var(--desk-team)",      "Teammate"),
    legendItem("var(--desk-mine)",      "Yours"),
  );
  stage.appendChild(legend);

  // Internal state
  let floorId = (getState().bookingDraft.floorId) || "ground";
  let scale = 1;
  let tx = 0, ty = 0;
  let dragging = false;
  let lastX = 0, lastY = 0;
  let panMoved = false;

  function setFloor(id) {
    floorId = id;
    update((s) => { s.bookingDraft.floorId = id; });
    [...switcher.querySelectorAll("button")].forEach((b) => b.setAttribute("aria-pressed", b.dataset.floor === id ? "true" : "false"));
    const f = FLOORS.find((x) => x.id === id);
    img.src = f.image;
    img.onload = () => {
      // Use natural dimensions if available, else fall back
      const w = img.naturalWidth || NATIVE_W;
      const h = img.naturalHeight || NATIVE_H;
      inner.style.width = w + "px";
      inner.style.height = h + "px";
      img.style.width = w + "px";
      img.style.height = h + "px";
      renderDots();
      fitToScreen();
    };
  }

  function applyTransform() {
    inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function fitToScreen() {
    const w = img.naturalWidth || inner.offsetWidth || NATIVE_W;
    const h = img.naturalHeight || inner.offsetHeight || NATIVE_H;
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    const fit = Math.min(stageW / w, stageH / h);
    scale = fit;
    tx = (stageW - w * scale) / 2;
    ty = (stageH - h * scale) / 2;
    applyTransform();
  }

  function zoomBy(factor) {
    const cx = stage.clientWidth / 2;
    const cy = stage.clientHeight / 2;
    // Zoom about the centre of the visible stage.
    const worldX = (cx - tx) / scale;
    const worldY = (cy - ty) / scale;
    scale = Math.max(0.2, Math.min(4, scale * factor));
    tx = cx - worldX * scale;
    ty = cy - worldY * scale;
    applyTransform();
  }

  function panBy(dx, dy) { tx += dx; ty += dy; applyTransform(); }

  // Drag pan
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.classList && e.target.classList.contains("floorplan__dot")) return;
    dragging = true;
    panMoved = false;
    lastX = e.clientX; lastY = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) panMoved = true;
    tx += dx; ty += dy;
    lastX = e.clientX; lastY = e.clientY;
    applyTransform();
  });
  stage.addEventListener("pointerup", () => { dragging = false; });
  stage.addEventListener("pointercancel", () => { dragging = false; });

  // Wheel zoom
  stage.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 20 && !e.shiftKey) {
      // pan with wheel
      tx -= e.deltaX; ty -= e.deltaY; applyTransform();
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const worldX = (cx - tx) / scale;
    const worldY = (cy - ty) / scale;
    scale = Math.max(0.2, Math.min(4, scale * factor));
    tx = cx - worldX * scale;
    ty = cy - worldY * scale;
    applyTransform();
  }, { passive: false });

  function renderDots() {
    // Remove old dots
    [...inner.querySelectorAll(".floorplan__dot")].forEach((d) => d.remove());
    const s = getState();
    const loc = s.bookingDraft.locationId;
    const date = bookingDateProvider ? bookingDateProvider() : s.bookingDraft.date;
    const me = currentUser();
    const selectedId = selectedDeskIdProvider ? selectedDeskIdProvider() : s.bookingDraft.selectedDeskId;
    const teamMap = s.bookingDraft.teamDeskMap || {};
    const teammates = new Set(s.bookingDraft.teammates || []);
    const myTeam = me ? s.users.filter((u) => u.team === me.team && u.id !== me.id).map((u) => u.id) : [];

    const w = img.naturalWidth || NATIVE_W;
    const h = img.naturalHeight || NATIVE_H;

    for (const desk of s.desks) {
      if (desk.locationId !== loc) continue;
      if (desk.floorId !== floorId) continue;

      // Amenity filter
      if (filterAmenities && filterAmenities.length) {
        const want = filterAmenities;
        const has = want.every((a) => desk.amenities.includes(a));
        if (!has) continue;
      }

      const bookings = bookingsOnDesk(desk.id, date);
      const occupant = bookings[0] ? s.users.find((u) => u.id === bookings[0].userId) : null;
      const dot = el("div", { class: "floorplan__dot", "data-desk": desk.id, role: "button", tabindex: "0", "aria-label": `Desk ${desk.number}` });
      dot.style.left = (desk.x * w) + "px";
      dot.style.top  = (desk.y * h) + "px";

      if (occupant && me && occupant.id === me.id) dot.classList.add("is-mine");
      else if (occupant && myTeam.includes(occupant.id)) dot.classList.add("is-team");
      else if (occupant) dot.classList.add("is-booked");
      if (selectedId === desk.id) dot.classList.add("is-selected");
      if (Object.values(teamMap).includes(desk.id)) dot.classList.add("is-team");

      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        if (panMoved) { panMoved = false; return; }
        onSelect && onSelect(desk);
      });
      dot.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect && onSelect(desk); }
      });
      inner.appendChild(dot);
    }
  }

  // public refresh hook
  root.refresh = renderDots;
  root.setFloor = setFloor;

  // initialise after first paint so stage has dimensions
  setTimeout(() => setFloor(floorId), 0);
  window.addEventListener("resize", () => { /* keep transform — user can refit */ });

  // Compose final layout: top row (switcher), stage with everything inside
  const wrap = el("div");
  wrap.appendChild(el("div", { class: "floor-switcher-row", style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "10px", flexWrap: "wrap" } }, [
    switcher,
    el("div", { style: { fontSize: "12px", color: "var(--c-fg-muted)" }, text: "Tap a desk to see details" }),
  ]));
  wrap.appendChild(root);
  wrap.refresh = renderDots;
  wrap.setFloor = setFloor;
  return wrap;
}

// Render a "popup" card describing a desk and any occupant.
// Returns an element ready to mount below/next to the floor plan.
export function DeskCard({ desk, date, actions }) {
  if (!desk) return el("div", { class: "empty" }, [
    el("h3", { text: "No desk selected" }),
    el("p", { text: "Tap a dot on the floor plan to see details." }),
  ]);

  const s = getState();
  const occupant = deskOccupantOn(desk.id, date);
  const booking = bookingsOnDesk(desk.id, date)[0];

  const amenityRow = el("div", { class: "desk-pop__amenities" },
    desk.amenities.map((a) => el("span", { class: "desk-pop__amenity" }, [
      el("span", { html: icon(AMENITIES[a]?.icon || "shield", 12) }),
      el("span", { text: AMENITIES[a]?.label || a }),
    ])),
  );

  const occupantBlock = occupant ? el("div", { class: "desk-pop__occupant" }, [
    el("span", { class: "avatar", text: occupant.initials }),
    el("div", { style: { flex: 1 } }, [
      el("div", { class: "desk-pop__name", text: occupant.name }),
      el("div", { class: "desk-pop__role", text: `${occupant.role} • ${occupant.team}` }),
    ]),
    booking ? el("span", { class: "badge", text: booking.label || "Booked" }) : null,
  ]) : null;

  return el("div", { class: "desk-pop", "data-desk": desk.id }, [
    el("div", { class: "desk-pop__head" }, [
      el("div", null, [
        el("div", { class: "desk-pop__num", text: `Desk ${desk.number}` }),
        el("div", { class: "desk-pop__zone", text: `${desk.zone} • ${capitalise(desk.floorId)} floor` }),
      ]),
      occupant
        ? el("span", { class: "badge badge--danger", text: "Occupied" })
        : el("span", { class: "badge", text: "Available" }),
    ]),
    amenityRow,
    occupantBlock,
    actions ? el("div", { class: "desk-pop__actions", style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, actions) : null,
  ]);
}

function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
