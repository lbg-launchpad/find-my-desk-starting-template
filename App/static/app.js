const state = {
  currentFloor: "ground",
  currentView: "bookings",
  selectedDeskId: null,
  desks: [],
  bookings: {},
  user: null,
  users: [],
  settings: {
    deskPreferences: [],
    preferredUsers: [],
  },
};

const SETTINGS_KEY = "find-my-desk-settings-v1";

const bookingDateInput = document.getElementById("bookingDate");
const floorImage = document.getElementById("floorImage");
const deskLayer = document.getElementById("deskLayer");
const floorSummary = document.getElementById("floorSummary");
const selectedDeskCard = document.getElementById("selectedDeskCard");
const bookButton = document.getElementById("bookButton");
const cancelButton = document.getElementById("cancelButton");
const bookingList = document.getElementById("bookingList");
const userBadge = document.getElementById("userBadge");
const pinTemplate = document.getElementById("deskPinTemplate");
const settingsForm = document.getElementById("settingsForm");
const preferredUserSearch = document.getElementById("preferredUserSearch");
const preferredUserResults = document.getElementById("preferredUserResults");
const selectedPreferredUsers = document.getElementById("selectedPreferredUsers");
const resetSettingsButton = document.getElementById("resetSettingsButton");

function loadSettings() {
  const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
  if (!rawSettings) return;

  try {
    const parsed = JSON.parse(rawSettings);
    state.settings = {
      deskPreferences: Array.isArray(parsed.deskPreferences) ? parsed.deskPreferences : [],
      preferredUsers: Array.isArray(parsed.preferredUsers) ? parsed.preferredUsers : [],
    };
  } catch {
    state.settings = { deskPreferences: [], preferredUsers: [] };
  }
}

function saveSettings() {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function getUserByEmail(email) {
  return state.users.find((user) => user.email === email);
}

function renderSelectedPreferredUsers() {
  selectedPreferredUsers.innerHTML = "";

  if (state.settings.preferredUsers.length === 0) {
    selectedPreferredUsers.innerHTML = "<span class='muted'>No people selected yet.</span>";
    return;
  }

  state.settings.preferredUsers.forEach((email) => {
    const user = getUserByEmail(email);
    if (!user) return;

    const chip = document.createElement("span");
    chip.className = "person-chip";
    chip.textContent = user.fullName;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "chip-remove";
    removeButton.setAttribute("aria-label", `Remove ${user.fullName}`);
    removeButton.textContent = "x";
    removeButton.addEventListener("click", () => {
      state.settings.preferredUsers = state.settings.preferredUsers.filter((entry) => entry !== email);
      renderSelectedPreferredUsers();
      renderPreferredUserResults(preferredUserSearch.value);
    });

    chip.appendChild(removeButton);
    selectedPreferredUsers.appendChild(chip);
  });
}

function renderPreferredUserResults(query = "") {
  preferredUserResults.innerHTML = "";
  const activeUserEmail = (state.user?.email || "").toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    preferredUserResults.classList.add("hidden");
    return;
  }

  preferredUserResults.classList.remove("hidden");
  const availableUsers = state.users.filter((user) => {
    if ((user.email || "").toLowerCase() === activeUserEmail) return false;
    if (state.settings.preferredUsers.includes(user.email)) return false;

    const text = `${user.fullName || ""} ${user.team || ""}`.toLowerCase();
    return text.includes(normalizedQuery);
  });

  if (availableUsers.length === 0) {
    preferredUserResults.innerHTML = "<div class='muted'>No matches found.</div>";
    return;
  }

  availableUsers.slice(0, 20).forEach((user) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "person-option";
    option.innerHTML = `<strong>${user.fullName}</strong><span>${user.team || "No team"}</span>`;
    option.addEventListener("click", () => {
      if (!state.settings.preferredUsers.includes(user.email)) {
        state.settings.preferredUsers.push(user.email);
      }
      preferredUserSearch.value = "";
      renderSelectedPreferredUsers();
      renderPreferredUserResults("");
    });
    preferredUserResults.appendChild(option);
  });
}

function hydrateSettingsForm() {
  settingsForm.querySelectorAll('input[name="deskPreferences"]').forEach((input) => {
    input.checked = state.settings.deskPreferences.includes(input.value);
  });
  renderSelectedPreferredUsers();
  renderPreferredUserResults(preferredUserSearch.value);
}

function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.viewPanel !== viewName);
  });
}

function deskMatchesPreferences(desk) {
  const preferences = state.settings.deskPreferences;
  if (preferences.length === 0) return true;
  const features = desk.features || [];
  return preferences.every((pref) => features.includes(pref));
}

function neighborHintForDesk(deskId) {
  if (state.settings.preferredUsers.length === 0) return "";

  const matched = Object.entries(state.bookings)
    .filter(([, booking]) => state.settings.preferredUsers.includes(booking.email))
    .map(([bookedDeskId, booking]) => `${booking.name} at ${bookedDeskId}`);

  if (matched.length === 0) {
    return "Preferred teammates are not booked yet.";
  }

  return `Preferred teammates booked: ${matched.join(", ")}.`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function selectedDate() {
  return bookingDateInput.value || todayISO();
}

function floorImageFor(floor) {
  return floor === "ground" ? "/floorplans/ground.png" : "/floorplans/first.png";
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

function getDeskById(deskId) {
  return state.desks.find((desk) => desk.id === deskId);
}

function setSelectedDesk(deskId) {
  state.selectedDeskId = deskId;
  renderSelectedDesk();
  renderDeskPins();
}

function renderSelectedDesk() {
  const desk = getDeskById(state.selectedDeskId);
  if (!desk) {
    selectedDeskCard.classList.add("empty");
    selectedDeskCard.innerHTML = "<p>No desk selected</p>";
    bookButton.disabled = true;
    cancelButton.disabled = true;
    return;
  }

  selectedDeskCard.classList.remove("empty");
  const features = (desk.features || []).join(" • ");
  const bookedBy = desk.bookedBy;
  const prefMatch = deskMatchesPreferences(desk)
    ? "Matches your desk preferences"
    : "Does not fully match your desk preferences";
  const neighborHint = neighborHintForDesk(desk.id);
  selectedDeskCard.innerHTML = `
    <h4>${desk.id} · ${desk.zone}</h4>
    <p>${features || "No features listed"}</p>
    <p>${bookedBy ? `Booked by ${bookedBy.name}` : "Available now"}</p>
    <p>${prefMatch}</p>
    <p>${neighborHint}</p>
  `;

  bookButton.disabled = !desk.available;
  cancelButton.disabled = desk.available;
}

function renderFloorSummary() {
  const visibleDesks = state.desks.filter((desk) => desk.floor === state.currentFloor);
  const available = visibleDesks.filter((desk) => desk.available).length;
  floorSummary.textContent = `${available} of ${visibleDesks.length} desks available on ${state.currentFloor} floor for ${selectedDate()}.`;
}

function renderBookingList() {
  bookingList.innerHTML = "";
  const entries = Object.entries(state.bookings);

  if (entries.length === 0) {
    bookingList.innerHTML = "<li class='muted'>No bookings yet for this day.</li>";
    return;
  }

  entries
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([deskId, booking]) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${deskId}</strong><span>${booking.name}</span>`;
      bookingList.appendChild(li);
    });
}

function renderDeskPins() {
  deskLayer.innerHTML = "";
  const visibleDesks = state.desks.filter((desk) => desk.floor === state.currentFloor);

  visibleDesks.forEach((desk) => {
    const pin = pinTemplate.content.firstElementChild.cloneNode(true);
    pin.style.left = `${desk.x}%`;
    pin.style.top = `${desk.y}%`;
    pin.textContent = desk.id;
    pin.dataset.deskId = desk.id;

    pin.classList.toggle("booked", !desk.available);
    pin.classList.toggle("selected", state.selectedDeskId === desk.id);
    pin.classList.toggle("pref-mismatch", !deskMatchesPreferences(desk));

    pin.title = desk.available ? `${desk.id} available` : `${desk.id} booked`;
    pin.addEventListener("click", () => setSelectedDesk(desk.id));
    deskLayer.appendChild(pin);
  });
}

async function loadMe() {
  const payload = await fetchJSON("/api/me");
  state.user = payload.user;
  userBadge.textContent = `${state.user.name} (${state.user.source})`;
}

async function loadUsers() {
  const users = await fetchJSON("/api/users");
  state.users = Array.isArray(users) ? users : [];
  renderSelectedPreferredUsers();
  renderPreferredUserResults(preferredUserSearch.value);
}

async function loadDesksAndBookings() {
  const date = selectedDate();
  const [deskPayload, bookingPayload] = await Promise.all([
    fetchJSON(`/api/desks?date=${encodeURIComponent(date)}`),
    fetchJSON(`/api/bookings?date=${encodeURIComponent(date)}`),
  ]);

  state.desks = deskPayload.desks;
  state.bookings = bookingPayload.bookings || {};

  if (state.selectedDeskId) {
    const selectedExists = state.desks.some((desk) => desk.id === state.selectedDeskId);
    if (!selectedExists) {
      state.selectedDeskId = null;
    }
  }

  renderDeskPins();
  renderFloorSummary();
  renderSelectedDesk();
  renderBookingList();
}

async function createBooking() {
  if (!state.selectedDeskId) return;

  try {
    await fetchJSON("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        deskId: state.selectedDeskId,
        date: selectedDate(),
        preferences: state.settings,
      }),
    });
    await loadDesksAndBookings();
  } catch (error) {
    window.alert(error.message);
  }
}

async function cancelBooking() {
  if (!state.selectedDeskId) return;

  try {
    await fetchJSON(`/api/bookings/${encodeURIComponent(state.selectedDeskId)}?date=${encodeURIComponent(selectedDate())}`, {
      method: "DELETE",
    });
    await loadDesksAndBookings();
  } catch (error) {
    window.alert(error.message);
  }
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      const floor = button.dataset.floor;
      state.currentFloor = floor;
      floorImage.src = floorImageFor(floor);

      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");

      renderDeskPins();
      renderFloorSummary();
    });
  });

  bookingDateInput.addEventListener("change", loadDesksAndBookings);
  bookButton.addEventListener("click", createBooking);
  cancelButton.addEventListener("click", cancelBooking);

  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedPreferences = Array.from(
      settingsForm.querySelectorAll('input[name="deskPreferences"]:checked')
    ).map((input) => input.value);

    state.settings = {
      deskPreferences: selectedPreferences,
      preferredUsers: [...state.settings.preferredUsers],
    };
    saveSettings();
    renderDeskPins();
    renderSelectedDesk();
    window.alert("Settings saved.");
  });

  preferredUserSearch.addEventListener("input", (event) => {
    renderPreferredUserResults(event.target.value);
  });

  preferredUserSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const firstResult = preferredUserResults.querySelector(".person-option");
      if (firstResult) {
        firstResult.click();
      }
    }
  });

  resetSettingsButton.addEventListener("click", () => {
    state.settings = { deskPreferences: [], preferredUsers: [] };
    saveSettings();
    hydrateSettingsForm();
    renderDeskPins();
    renderSelectedDesk();
  });
}

async function init() {
  const initialView = document.body.dataset.initialView || "bookings";
  bookingDateInput.value = todayISO();
  loadSettings();
  bindEvents();
  switchView(initialView);

  try {
    await loadMe();
    await loadUsers();
    hydrateSettingsForm();
    await loadDesksAndBookings();
  } catch (error) {
    console.error(error);
    floorSummary.textContent = "Unable to load desk data right now.";
  }
}

init();