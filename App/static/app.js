const state = {
  currentFloor: "ground",
  currentView: "bookings",
  selectedDeskId: null,
  recommendedDeskIds: [],
  desks: [],
  bookings: {},
  user: null,
  users: [],
  settings: {
    deskPreferences: [],
    preferredUsers: [],
    anchorDays: [],
  },
  validDeskPreferences: [],
  busyness: null,
  weather: null,
};

const bookingDateInput = document.getElementById("bookingDate");
const floorImage = document.getElementById("floorImage");
const deskLayer = document.getElementById("deskLayer");
const floorSummary = document.getElementById("floorSummary");
const selectedDeskCard = document.getElementById("selectedDeskCard");
const bookButton = document.getElementById("bookButton");
const cancelButton = document.getElementById("cancelButton");
const bookingList = document.getElementById("bookingList");
const officeBusyMeta = document.getElementById("officeBusyMeta");
const recommendationMeta = document.getElementById("recommendationMeta");
const recommendedDeskList = document.getElementById("recommendedDeskList");
const userBadge = document.getElementById("userBadge");
const userSwitchSelect = document.getElementById("userSwitchSelect");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const pinTemplate = document.getElementById("deskPinTemplate");
const settingsForm = document.getElementById("settingsForm");
const preferredUserSearch = document.getElementById("preferredUserSearch");
const preferredUserResults = document.getElementById("preferredUserResults");
const selectedPreferredUsers = document.getElementById("selectedPreferredUsers");
const resetSettingsButton = document.getElementById("resetSettingsButton");
const deskPreferencesGrid = document.getElementById("deskPreferencesGrid");
const weatherHeadline = document.getElementById("weatherHeadline");
const weatherSummary = document.getElementById("weatherSummary");
const weatherDetail = document.getElementById("weatherDetail");
const weatherTemperature = document.getElementById("weatherTemperature");
const weatherSource = document.getElementById("weatherSource");
const weatherIcon = document.getElementById("weatherIcon");
const weatherPanel = document.getElementById("weatherPanel");
const TEAM_NEARBY_DISTANCE = 18;

async function loadDeskPreferenceOptions() {
  try {
    const payload = await fetchJSON("/api/user-settings/options");
    state.validDeskPreferences = Array.isArray(payload.deskPreferences)
      ? payload.deskPreferences
      : [];
  } catch {
    state.validDeskPreferences = [];
  }
}

function renderDeskPreferenceOptions() {
  if (!deskPreferencesGrid) return;
  deskPreferencesGrid.innerHTML = "";

  if (state.validDeskPreferences.length === 0) {
    deskPreferencesGrid.innerHTML = "<span class='muted'>No desk preference options are available right now.</span>";
    return;
  }

  state.validDeskPreferences.forEach((value) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "deskPreferences";
    input.value = value;

    label.append(input, ` ${formatPreference(value)}`);
    deskPreferencesGrid.appendChild(label);
  });
}

async function loadSettings() {
  try {
    const parsed = await fetchJSON("/api/user-settings");
    state.settings = {
      deskPreferences: Array.isArray(parsed.deskPreferences) ? parsed.deskPreferences : [],
      preferredUsers: Array.isArray(parsed.preferredUsers) ? parsed.preferredUsers : [],
      anchorDays: Array.isArray(parsed.anchorDays) ? parsed.anchorDays : [],
    };
  } catch {
    state.settings = { deskPreferences: [], preferredUsers: [], anchorDays: [] };
  }
}

async function saveSettings() {
  const payload = await fetchJSON("/api/user-settings", {
    method: "PUT",
    body: JSON.stringify(state.settings),
  });

  state.settings = {
    deskPreferences: Array.isArray(payload.deskPreferences) ? payload.deskPreferences : [],
    preferredUsers: Array.isArray(payload.preferredUsers) ? payload.preferredUsers : [],
    anchorDays: Array.isArray(payload.anchorDays) ? payload.anchorDays : [],
  };

  return payload;
}

function getUserByEmail(email) {
  if (!email) return undefined;
  const normalized = String(email).toLowerCase();
  return state.users.find((user) => (user.email || "").toLowerCase() === normalized);
}

function currentUserTeam() {
  const profile = activeUserProfile();
  const team = profile?.team;
  return team ? String(team).trim().toLowerCase() : "";
}

function isTeammateEmail(email) {
  const myTeam = currentUserTeam();
  if (!myTeam) return false;
  const myEmail = (state.user?.email || "").toLowerCase();
  const otherEmail = String(email || "").toLowerCase();
  if (!otherEmail || otherEmail === myEmail) return false;
  const other = getUserByEmail(otherEmail);
  const otherTeam = other?.team ? String(other.team).trim().toLowerCase() : "";
  return Boolean(otherTeam) && otherTeam === myTeam;
}

function getTeammateBookedDesks() {
  return state.desks.filter((desk) => {
    if (desk.available) return false;
    const bookingEmail = desk.bookedBy?.email;
    return Boolean(bookingEmail) && isTeammateEmail(bookingEmail);
  });
}

function isNearTeammateBookedDesk(desk) {
  if (!desk || !desk.available) return false;

  const teammateBookedDesks = getTeammateBookedDesks();
  if (teammateBookedDesks.length === 0) return false;

  return teammateBookedDesks.some((bookedDesk) => {
    if (bookedDesk.floor !== desk.floor) return false;

    const dx = Number(desk.x) - Number(bookedDesk.x);
    const dy = Number(desk.y) - Number(bookedDesk.y);
    return Math.hypot(dx, dy) <= TEAM_NEARBY_DISTANCE;
  });
}

function preferenceMatchesDesk(desk, pref, features) {
  if (pref === "window-seat") {
    return desk.nearWindow === true;
  }
  if (pref === "near-team") {
    return isNearTeammateBookedDesk(desk);
  }
  return features.includes(pref);
}

function renderSelectedPreferredUsers() {
  if (!selectedPreferredUsers) return;
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
  if (!preferredUserResults) return;
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
    option.append(
      createElement("strong", user.fullName),
      createElement("span", user.team || "No team")
    );
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
  if (!settingsForm) return;
  settingsForm.querySelectorAll('input[name="deskPreferences"]').forEach((input) => {
    input.checked = state.settings.deskPreferences.includes(input.value);
  });
  settingsForm.querySelectorAll('input[name="anchorDays"]').forEach((input) => {
    input.checked = state.settings.anchorDays.includes(input.value);
  });
  renderSelectedPreferredUsers();
  renderPreferredUserResults(preferredUserSearch?.value || "");
}

function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll(".nav-tab").forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.viewPanel !== viewName);
  });
  weatherPanel?.classList.toggle("hidden", viewName !== "bookings");
}

async function refreshSettingsFromDb() {
  await Promise.all([loadSettings(), loadDeskPreferenceOptions()]);
  renderDeskPreferenceOptions();
  hydrateSettingsForm();
}

function deskMatchesPreferences(desk) {
  const preferences = state.settings.deskPreferences;
  if (preferences.length === 0) return true;
  const features = (desk.features || []).map((feature) => String(feature).toLowerCase());
  return preferences.some((pref) => preferenceMatchesDesk(desk, pref, features));
}

function neighborHintForDesk(deskId) {
  if (state.settings.preferredUsers.length === 0) return "";

  // Only show hint if this specific desk is booked by a preferred teammate
  const booking = state.bookings[deskId];
  if (!booking || !state.settings.preferredUsers.includes(booking.email)) {
    return "";
  }

  return `Preferred teammate booked: ${booking.name}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isFutureDate(isoDate) {
  return isoDate > todayISO();
}

function selectedDate() {
  return bookingDateInput.value || todayISO();
}

function floorImageFor(floor) {
  return floor === "ground" ? "/floorplans/ground.png" : "/floorplans/first.png";
}

function formatPreference(pref) {
  return String(pref || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function activeUserProfile() {
  const userEmail = (state.user?.email || "").toLowerCase();
  if (!userEmail) return null;
  return state.users.find((user) => (user.email || "").toLowerCase() === userEmail) || null;
}

function getProfilePreferences() {
  const rawPreferences = Array.isArray(state.settings.deskPreferences)
    ? state.settings.deskPreferences
    : [];
  return [...new Set(rawPreferences.map((pref) => String(pref || "").trim().toLowerCase()).filter(Boolean))];
}

function scoreDeskForPreferences(desk, preferences) {
  if (!desk.available) return { score: -1, matched: [] };

  const features = (desk.features || []).map((feature) => String(feature).toLowerCase());
  const matched = preferences.filter((pref) => preferenceMatchesDesk(desk, pref, features));

  let score = 0;
  if (preferences.length > 0) {
    const matchedCount = matched.length;
    const preferenceCoverage = matchedCount / preferences.length;
    score = (matchedCount * 10) + preferenceCoverage;

    // Full matches should always rank above partial matches.
    if (matchedCount === preferences.length) {
      score += 5;
    }
  }

  return { score, matched };
}

function setFloor(floor) {
  state.currentFloor = floor;
  floorImage.src = floorImageFor(floor);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.floor === floor);
  });

  renderFloorSummary();
}

function renderRecommendations() {
  if (!recommendedDeskList || !recommendationMeta) return;

  recommendedDeskList.innerHTML = "";
  state.recommendedDeskIds = [];
  const MAX_RECOMMENDED_DESKS = 5;
  const preferences = getProfilePreferences();
  const hasPreferredUsers = state.settings.preferredUsers.length > 0;

  if (preferences.length === 0 && !hasPreferredUsers) {
    recommendationMeta.textContent = "Set your preferences in Settings to see personalised recommendations.";
    recommendedDeskList.innerHTML = "";
    return;
  }

  if (state.desks.length === 0) {
    recommendationMeta.textContent = "Desk data is loading...";
    recommendedDeskList.innerHTML = "<li class='muted'>Recommendations will appear once desks are loaded.</li>";
    return;
  }

  const hasDeskPreferences = preferences.length > 0;
  const ranked = state.desks
    .map((desk) => ({ desk, ...scoreDeskForPreferences(desk, preferences) }))
    .filter((entry) => entry.score >= 0)
    .filter((entry) => !hasDeskPreferences || entry.matched.length > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.desk.floor !== b.desk.floor) {
        if (a.desk.floor === state.currentFloor) return -1;
        if (b.desk.floor === state.currentFloor) return 1;
      }
      return a.desk.id.localeCompare(b.desk.id);
    });

  const visibleRecommendations = ranked.slice(0, MAX_RECOMMENDED_DESKS);
  state.recommendedDeskIds = visibleRecommendations
    .filter(({ matched }) => matched.length > 0)
    .map(({ desk }) => desk.id);

  if (ranked.length === 0) {
    if (hasDeskPreferences) {
      recommendationMeta.textContent = "No available desks match your selected preferences.";
      recommendedDeskList.innerHTML = "<li class='muted'>Try changing your preferences or date.</li>";
      return;
    }

    recommendationMeta.textContent = "No available desks right now.";
    recommendedDeskList.innerHTML = "<li class='muted'>All desks are booked for this date.</li>";
    return;
  }

  if (preferences.length === 0) {
    recommendationMeta.textContent = "No profile desk preferences found, showing all available desks.";
  } else {
    recommendationMeta.textContent = `Showing ${ranked.length} available desks matching at least one selected preference (${preferences.map(formatPreference).join(", ")}).`;
  }

  visibleRecommendations.forEach(({ desk, matched }) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recommendation-item";
    button.addEventListener("click", () => {
      setFloor(desk.floor);
      setSelectedDesk(desk.id);
    });

    const title = createElement("strong", `Desk ${deskLabel(desk.id)} (${desk.floor})`);
    const matchSummary = hasDeskPreferences
      ? `${matched.length}/${preferences.length} preferences matched`
      : "Available";
    const detailsText = matched.length > 0
      ? `${desk.zone} • ${matchSummary} • ${matched.map(formatPreference).join(", ")}`
      : `${desk.zone} • ${matchSummary}`;
    const details = createElement("span", detailsText);

    button.append(title, details);
    item.appendChild(button);
    recommendedDeskList.appendChild(item);
  });
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

function deskLabel(deskId) {
  return String(deskId || "").toUpperCase();
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
  const allAttributes = [...(desk.features || [])];
  if (desk.nearWindow) allAttributes.push("window-seat");
  const features = allAttributes.join(" • ");
  const bookedBy = desk.bookedBy;
  const userHasDeskPreferences = (state.settings.deskPreferences || []).length > 0;
  const prefMatch = userHasDeskPreferences
    ? (deskMatchesPreferences(desk)
      ? "Matches your desk preferences"
      : "Does not fully match your desk preferences")
    : "";
  const neighborHint = neighborHintForDesk(desk.id);
  const bookedByLine = bookedBy ? `Booked by ${bookedBy.name}` : "Available now";
  const teamName = activeUserProfile()?.team || "";
  const teammateLine = bookedBy && isTeammateEmail(bookedBy.email)
    ? `Same team as you${teamName ? ` (${teamName})` : ""}`
    : "";

  const children = [
    createElement("h4", `Desk ${deskLabel(desk.id)} · ${desk.zone}`),
    createElement("p", features || "No features listed"),
  ];
  const statusLine = createElement("p", bookedByLine);
  if (!bookedBy) {
    statusLine.classList.add("availability-status");
  }
  children.push(statusLine);
  if (prefMatch) children.push(createElement("p", prefMatch));
  if (neighborHint) children.push(createElement("p", neighborHint));
  if (teammateLine) children.push(createElement("p", teammateLine));
  selectedDeskCard.replaceChildren(...children);

  bookButton.disabled = !desk.available;
  cancelButton.disabled = desk.available;
}

function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderWeatherPanel() {
  if (!weatherHeadline || !weatherSummary || !weatherDetail || !weatherTemperature || !weatherSource) {
    return;
  }

  const weather = state.weather;
  if (!weather) {
    weatherHeadline.textContent = `Weather unavailable for ${selectedDate()}`;
    weatherSummary.textContent = "We could not load the office forecast right now.";
    weatherDetail.textContent = "Try again after the page finishes loading.";
    weatherTemperature.textContent = "--";
    weatherSource.textContent = "Unavailable";
    weatherIcon?.classList.add("hidden");
    return;
  }

  const temperature = Number(weather.temperature);
  const hasTemperature = Number.isFinite(temperature);
  const formattedTemperature = hasTemperature ? `${Math.round(temperature)}°C` : "--";
  const headline = weather.mode === "future"
    ? `Forecast for ${weather.date}`
    : weather.mode === "forecast"
      ? `Short-range forecast for ${weather.date}`
      : `Current weather for ${weather.date}`;

  weatherHeadline.textContent = headline;
  weatherSummary.textContent = `${weather.location} · ${weather.condition}`;

  if (weather.mode === "future" || weather.mode === "forecast") {
    const high = Number.isFinite(Number(weather.highTemperature)) ? `${Math.round(Number(weather.highTemperature))}°C` : "--";
    const low = Number.isFinite(Number(weather.lowTemperature)) ? `${Math.round(Number(weather.lowTemperature))}°C` : "--";
    const humidity = weather.humidity === null || weather.humidity === undefined ? "" : ` · Humidity ${weather.humidity}%`;
    const rainChance = weather.chanceOfRain === null || weather.chanceOfRain === undefined || weather.chanceOfRain === ""
      ? ""
      : ` · ${weather.chanceOfRain}% chance of rain`;
    weatherDetail.textContent = `Average ${formattedTemperature} · High ${high} · Low ${low}${humidity}${rainChance}`;
    weatherSource.textContent = weather.mode === "forecast" ? "Short-range forecast" : "Future forecast";
  } else {
    const feelsLike = Number.isFinite(Number(weather.feelsLike)) ? `${Math.round(Number(weather.feelsLike))}°C` : "--";
    const humidity = weather.humidity === null || weather.humidity === undefined ? "--" : `${weather.humidity}%`;
    const windKph = weather.windKph === null || weather.windKph === undefined ? "--" : `${weather.windKph} kph`;
    weatherDetail.textContent = `Feels like ${feelsLike} · Humidity ${humidity} · Wind ${windKph}`;
    weatherSource.textContent = "Current conditions";
  }

  weatherTemperature.textContent = formattedTemperature;
  if (weatherIcon) {
    if (weather.icon) {
      weatherIcon.src = weather.icon.startsWith("//") ? `https:${weather.icon}` : weather.icon;
      weatherIcon.alt = weather.condition || "Weather icon";
      weatherIcon.classList.remove("hidden");
    } else {
      weatherIcon.classList.add("hidden");
    }
  }
}

async function loadWeather() {
  if (!weatherHeadline) return;

  const date = selectedDate();
  weatherHeadline.textContent = isFutureDate(date) ? `Loading forecast for ${date}...` : `Loading weather for ${date}...`;
  weatherSummary.textContent = "Fetching the latest office conditions.";
  weatherDetail.textContent = "Please wait while we load the forecast.";
  weatherTemperature.textContent = "--";
  weatherSource.textContent = "Loading";
  weatherIcon?.classList.add("hidden");

  try {
    state.weather = await fetchJSON(`/api/weather?date=${encodeURIComponent(date)}`);
  } catch (error) {
    state.weather = null;
    weatherHeadline.textContent = `Weather unavailable for ${date}`;
    weatherSummary.textContent = error.message;
    weatherDetail.textContent = "The office weather service could not be reached.";
    weatherTemperature.textContent = "--";
    weatherSource.textContent = "Unavailable";
    weatherIcon?.classList.add("hidden");
    return;
  }

  renderWeatherPanel();
}

function renderUserSwitchOptions() {
  if (!userSwitchSelect) return;

  userSwitchSelect.innerHTML = "";
  if (state.users.length === 0) {
    userSwitchSelect.appendChild(createElement("option", "No users available"));
    userSwitchSelect.disabled = true;
    return;
  }

  const currentEmail = (state.user?.email || "").toLowerCase();
  const sortedUsers = [...state.users].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  sortedUsers.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.email || "";
    const label = user.fullName || user.email || "Unknown user";
    option.textContent = user.team ? `${label} (${user.team})` : label;
    if ((user.email || "").toLowerCase() === currentEmail) {
      option.selected = true;
    }
    userSwitchSelect.appendChild(option);
  });
  userSwitchSelect.disabled = false;
}

async function switchActiveUser(email) {
  await fetchJSON("/api/switch-user", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  await loadMe();
  await loadUsers();
  await refreshSettingsFromDb();
  await loadDesksAndBookings();
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

      const isPreferredUser = state.settings.preferredUsers.includes(booking.email);
      const isTeammate = isTeammateEmail(booking.email);

      if (isPreferredUser) li.classList.add("booking-preferred-user");
      if (isTeammate && !isPreferredUser) li.classList.add("booking-teammate");

      li.append(createElement("strong", deskLabel(deskId)), createElement("span", booking.name));

      if (isTeammate) {
        const indicator = document.createElement("span");
        indicator.className = "teammate-indicator";
        indicator.setAttribute("aria-label", "same team");
        indicator.textContent = "👥";
        li.appendChild(indicator);
      }
      if (isPreferredUser) {
        const indicator = document.createElement("span");
        indicator.className = "preferred-indicator";
        indicator.setAttribute("aria-label", "preferred colleague");
        indicator.textContent = "⭐";
        li.appendChild(indicator);
      }

      bookingList.appendChild(li);
    });
}

function renderOfficeBusyness() {
  if (!officeBusyMeta) return;

  if (!state.busyness) {
    officeBusyMeta.textContent = "Unable to estimate office busyness right now.";
    return;
  }

  const {
    band,
    predictedOccupancyCount,
    predictedOccupancyPct,
    totalDesks,
    anchorMatchedUsers,
    bookedCount,
  } = state.busyness;

  officeBusyMeta.textContent = `${band} expected: about ${predictedOccupancyCount}/${totalDesks} desks (${predictedOccupancyPct}%) for ${selectedDate()}. Based on ${anchorMatchedUsers} users with this anchor-day pattern and ${bookedCount} desks already booked.`;
}

function renderDeskPins() {
  deskLayer.innerHTML = "";
  const recommendedDeskIds = new Set(state.recommendedDeskIds);
  const visibleDesks = state.desks.filter((desk) => desk.floor === state.currentFloor);

  visibleDesks.forEach((desk) => {
    const pin = pinTemplate.content.firstElementChild.cloneNode(true);
    pin.style.left = `${desk.x}%`;
    pin.style.top = `${desk.y}%`;
    pin.textContent = deskLabel(desk.id);
    pin.dataset.deskId = desk.id;
    const isRecommended = recommendedDeskIds.has(desk.id);
    
    const bookedEmail = !desk.available ? desk.bookedBy?.email : null;
    const isBookedByPreferredUser = Boolean(bookedEmail && state.settings.preferredUsers.includes(bookedEmail));
    const isBookedByTeammate = Boolean(bookedEmail && isTeammateEmail(bookedEmail));

    pin.classList.toggle("available", desk.available);
    pin.classList.toggle("booked", !desk.available);
    pin.classList.toggle("selected", state.selectedDeskId === desk.id);
    pin.classList.toggle("recommended", isRecommended);
    pin.classList.toggle("pref-mismatch", !isRecommended && !deskMatchesPreferences(desk));
    pin.classList.toggle("booked-by-teammate", isBookedByTeammate && !isBookedByPreferredUser);
    pin.classList.toggle("booked-by-preferred", isBookedByPreferredUser);

    pin.title = desk.available
      ? `Desk ${deskLabel(desk.id)} available`
      : `Desk ${deskLabel(desk.id)} booked`;
    pin.addEventListener("click", () => setSelectedDesk(desk.id));
    deskLayer.appendChild(pin);
  });
}

async function loadMe() {
  const payload = await fetchJSON("/api/me");
  state.user = payload.user;
  userBadge.textContent = `${state.user.name} (${state.user.source})`;

  const isAuthenticated = Boolean(payload.authenticated);
  signInButton?.classList.toggle("hidden", isAuthenticated);
  signOutButton?.classList.toggle("hidden", !isAuthenticated);
}

async function loadUsers() {
  const users = await fetchJSON("/api/users");
  state.users = Array.isArray(users) ? users : [];
  renderUserSwitchOptions();
  renderSelectedPreferredUsers();
  renderPreferredUserResults(preferredUserSearch?.value || "");
  renderRecommendations();
}

async function loadDesksAndBookings() {
  const date = selectedDate();
  const [deskPayload, bookingPayload, busynessPayload] = await Promise.all([
    fetchJSON(`/api/desks?date=${encodeURIComponent(date)}`),
    fetchJSON(`/api/bookings?date=${encodeURIComponent(date)}`),
    fetchJSON(`/api/office-busyness?date=${encodeURIComponent(date)}`),
  ]);

  state.desks = deskPayload.desks;
  state.bookings = bookingPayload.bookings || {};
  state.busyness = busynessPayload || null;

  if (state.selectedDeskId) {
    const selectedExists = state.desks.some((desk) => desk.id === state.selectedDeskId);
    if (!selectedExists) {
      state.selectedDeskId = null;
    }
  }

  renderRecommendations();
  renderDeskPins();
  renderFloorSummary();
  renderOfficeBusyness();
  renderSelectedDesk();
  renderBookingList();
  await loadWeather();
}

async function createBooking() {
  if (!state.selectedDeskId) return;

  try {
    await fetchJSON("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        deskId: state.selectedDeskId,
        date: selectedDate(),
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
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      const viewName = button.dataset.view;

      if (viewName === "settings") {
        try {
          await refreshSettingsFromDb();
        } catch (error) {
          window.alert(error.message);
          return;
        }
      }

      switchView(viewName);
    });
  });

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      setFloor(button.dataset.floor);
      renderRecommendations();
      renderDeskPins();
    });
  });

  bookingDateInput.addEventListener("change", loadDesksAndBookings);
  bookButton.addEventListener("click", createBooking);
  cancelButton.addEventListener("click", cancelBooking);

  if (userSwitchSelect) {
    userSwitchSelect.addEventListener("change", async (event) => {
      const selectedEmail = String(event.target.value || "").trim().toLowerCase();
      if (!selectedEmail) return;
      if ((state.user?.email || "").toLowerCase() === selectedEmail) return;

      userSwitchSelect.disabled = true;
      try {
        await switchActiveUser(selectedEmail);
      } catch (error) {
        window.alert(error.message);
        renderUserSwitchOptions();
      } finally {
        userSwitchSelect.disabled = false;
      }
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selectedPreferences = Array.from(
      settingsForm.querySelectorAll('input[name="deskPreferences"]:checked')
    ).map((input) => input.value);
    const selectedAnchorDays = Array.from(
      settingsForm.querySelectorAll('input[name="anchorDays"]:checked')
    ).map((input) => input.value);

    state.settings = {
      deskPreferences: selectedPreferences,
      preferredUsers: [...state.settings.preferredUsers],
      anchorDays: selectedAnchorDays,
    };

    let savePayload;
    try {
      savePayload = await saveSettings();
    } catch (error) {
      window.alert(error.message);
      return;
    }

    await loadDesksAndBookings();
    const ignoredPreferences = Array.isArray(savePayload?.ignoredPreferences)
      ? savePayload.ignoredPreferences
      : [];
    if (ignoredPreferences.length > 0) {
      window.alert(`Settings saved. Some preferences are not available right now: ${ignoredPreferences.join(", ")}.`);
      return;
    }
    window.alert("Settings saved.");
  });
  }

  if (preferredUserSearch) {
    preferredUserSearch.addEventListener("input", (event) => {
      renderPreferredUserResults(event.target.value);
    });

    preferredUserSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const firstResult = preferredUserResults?.querySelector(".person-option");
        if (firstResult) {
          firstResult.click();
        }
      }
    });
  }

  if (resetSettingsButton) {
    resetSettingsButton.addEventListener("click", async () => {
      state.settings = { deskPreferences: [], preferredUsers: [], anchorDays: [] };
      try {
        await saveSettings();
      } catch (error) {
        window.alert(error.message);
        return;
      }

      hydrateSettingsForm();
      await loadDesksAndBookings();
    });
  }
}

async function init() {
  const initialView = document.body.dataset.initialView || "bookings";
  bookingDateInput.value = todayISO();
  bindEvents();
  switchView(initialView);

  try {
    await loadMe();
    await loadUsers();
    await refreshSettingsFromDb();
    await loadDesksAndBookings();
  } catch (error) {
    console.error(error);
    floorSummary.textContent = "Unable to load desk data right now.";
  }
}

init();