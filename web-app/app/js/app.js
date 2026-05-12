// App entry: bootstraps data, wires router, theme toggle, subscribes to state.

import { bootstrapData } from "./data.js";
import {
  getState,
  hydrate,
  subscribe,
  currentUser,
  update,
} from "./store.js";
import { route, startRouter, navigate } from "./router.js";
import { HomeView } from "./views/home.js";
import { BookView } from "./views/book.js";
import { BookingsView } from "./views/bookings.js";
import { TeamView } from "./views/team.js";
import { WayfinderView } from "./views/wayfinder.js";
import { ProfileView } from "./views/profile.js";

async function boot() {
  // 1. Hydrate from JSON
  try {
    const data = await bootstrapData();
    hydrate(data);
  } catch (err) {
    console.error("Bootstrap failed", err);
    document.getElementById("appMain").textContent = "Failed to load data. Make sure you're serving from the project root (python3 -m http.server).";
    return;
  }

  // 2. Theme — restore preference; toggle button
  document.documentElement.setAttribute("data-theme", getState().theme || "light");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  function setThemeIcon() {
    const theme = document.documentElement.getAttribute("data-theme");
    themeIcon.innerHTML = theme === "dark"
      ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`
      : `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`;
  }
  setThemeIcon();
  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    update((s) => { s.theme = next; });
    setThemeIcon();
  });

  // 3. Avatar -> profile
  const avatarBtn = document.getElementById("avatarBtn");
  const avatarInitials = document.getElementById("avatarInitials");
  // Ensure the avatar can host an absolutely-positioned <img> overlay.
  avatarInitials.style.position = "relative";
  avatarInitials.style.overflow = "hidden";

  // One persistent <img> overlay. When src is set successfully, it covers the
  // initials. On load error, we hide it and the initials show through.
  const avatarImg = document.createElement("img");
  Object.assign(avatarImg.style, {
    position: "absolute", inset: "0", width: "100%", height: "100%",
    objectFit: "cover", borderRadius: "inherit", display: "none",
  });
  avatarImg.alt = "";
  avatarImg.addEventListener("error", () => { avatarImg.style.display = "none"; });
  avatarImg.addEventListener("load",  () => { avatarImg.style.display = "block"; });
  avatarInitials.appendChild(avatarImg);

  function deriveInitials(name) {
    return (name || "").trim().split(/\s+/).slice(0, 2).map((s) => s[0] || "").join("").toUpperCase();
  }

  function paintAvatar() {
    const u = currentUser();
    // Always set initials as the base layer — they're the fallback when no
    // photo / a broken photo URL is set.
    const initials = (u && u.initials) || (u && deriveInitials(u.name)) || "?";
    // Use a text node + the img sibling, rather than textContent (which would
    // wipe the appended <img>).
    while (avatarInitials.firstChild && avatarInitials.firstChild !== avatarImg) {
      avatarInitials.removeChild(avatarInitials.firstChild);
    }
    avatarInitials.insertBefore(document.createTextNode(initials), avatarImg);

    // Clear stale background-image styles from earlier paintAvatar versions.
    avatarInitials.style.backgroundImage = "";
    avatarInitials.style.backgroundSize = "";
    avatarInitials.style.backgroundPosition = "";
    avatarInitials.style.color = "";

    if (u && u.avatarDataUrl) {
      avatarImg.src = u.avatarDataUrl;
      // display becomes "block" only on successful load (handler above).
    } else {
      avatarImg.removeAttribute("src");
      avatarImg.style.display = "none";
    }
  }
  paintAvatar();
  avatarBtn.addEventListener("click", () => { location.hash = "#/profile"; });

  // 4. Routes
  route("/",          HomeView);
  route("/book",      BookView);
  route("/bookings",  BookingsView);
  route("/team",      TeamView);
  route("/wayfinder", WayfinderView);
  route("/profile",   ProfileView);

  // 5. Re-render current view on state changes (cheap full re-render)
  subscribe(() => { paintAvatar(); /* views re-render via their own event handlers; full re-render on hashchange */ });

  // 6. Start
  startRouter();

  // 7. Register service worker for PWA install (best-effort)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* ignore in dev */ });
  }
}

boot();
