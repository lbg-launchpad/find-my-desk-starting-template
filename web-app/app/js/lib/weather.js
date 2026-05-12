// Tiny weather helper. Uses Open-Meteo's free forecast endpoint (no API key)
// to fetch one day of forecast for the office a user is booked at.
//
// Results are cached per (locationId, date) so repeated renders don't re-hit
// the network. Failures silently resolve to null so the UI can hide gracefully.

const LOCATION_COORDS = {
  london:    { lat: 51.5152, lon: -0.0925, label: "London"    }, // Gresham St
  edinburgh: { lat: 55.9533, lon: -3.1883, label: "Edinburgh" }, // The Mound
  leeds:     { lat: 53.8008, lon: -1.5491, label: "Leeds"     }, // Lovell Park
  bristol:   { lat: 51.4545, lon: -2.5879, label: "Bristol"   }, // Canon's Marsh
};

// WMO weather interpretation codes (Open-Meteo) -> { label, kind }.
// `kind` keys into ICONS below.
const WMO = {
  0:  { label: "Clear",            kind: "sun" },
  1:  { label: "Mostly clear",     kind: "sun" },
  2:  { label: "Partly cloudy",    kind: "sun-cloud" },
  3:  { label: "Overcast",         kind: "cloud" },
  45: { label: "Fog",              kind: "fog" },
  48: { label: "Freezing fog",     kind: "fog" },
  51: { label: "Light drizzle",    kind: "drizzle" },
  53: { label: "Drizzle",          kind: "drizzle" },
  55: { label: "Heavy drizzle",    kind: "drizzle" },
  56: { label: "Freezing drizzle", kind: "drizzle" },
  57: { label: "Freezing drizzle", kind: "drizzle" },
  61: { label: "Light rain",       kind: "rain" },
  63: { label: "Rain",             kind: "rain" },
  65: { label: "Heavy rain",       kind: "rain" },
  66: { label: "Freezing rain",    kind: "rain" },
  67: { label: "Freezing rain",    kind: "rain" },
  71: { label: "Light snow",       kind: "snow" },
  73: { label: "Snow",             kind: "snow" },
  75: { label: "Heavy snow",       kind: "snow" },
  77: { label: "Snow grains",      kind: "snow" },
  80: { label: "Rain showers",     kind: "rain" },
  81: { label: "Rain showers",     kind: "rain" },
  82: { label: "Heavy showers",    kind: "rain" },
  85: { label: "Snow showers",     kind: "snow" },
  86: { label: "Snow showers",     kind: "snow" },
  95: { label: "Thunderstorm",     kind: "storm" },
  96: { label: "Thunderstorm",     kind: "storm" },
  99: { label: "Thunderstorm",     kind: "storm" },
};

// Lucide-flavoured 24px inline SVGs. Stroke uses currentColor so they tint
// with the surrounding text. Keep markup minimal.
const ICONS = {
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`,
  "sun-cloud": `<path d="M12 3v1M19 5.4l-.7.7M21 12h-1M5.7 6.1l-.7-.7M3 12H2"/><circle cx="12" cy="12" r="3"/><path d="M16 17a4 4 0 0 0-7.6-1.5A3.5 3.5 0 1 0 8 22h8a3 3 0 0 0 0-5z"/>`,
  cloud: `<path d="M17 18a5 5 0 0 0-9.4-2A4 4 0 1 0 7 24h10a4 4 0 0 0 0-6z" transform="translate(0,-3)"/>`,
  fog: `<path d="M5 9h14M3 13h18M5 17h14M3 21h18"/>`,
  drizzle: `<path d="M17 13a5 5 0 0 0-9.4-2A4 4 0 1 0 7 19h10a4 4 0 0 0 0-6z"/><path d="M8 21v-1M12 22v-1M16 21v-1"/>`,
  rain: `<path d="M17 13a5 5 0 0 0-9.4-2A4 4 0 1 0 7 19h10a4 4 0 0 0 0-6z"/><path d="M8 22l1-3M12 23l1-4M16 22l1-3"/>`,
  snow: `<path d="M17 13a5 5 0 0 0-9.4-2A4 4 0 1 0 7 19h10a4 4 0 0 0 0-6z"/><path d="M8 21l.01.01M12 22l.01.01M16 21l.01.01M10 20l.01.01M14 20l.01.01"/>`,
  storm: `<path d="M17 13a5 5 0 0 0-9.4-2A4 4 0 1 0 7 19h10a4 4 0 0 0 0-6z"/><path d="M13 14l-3 5h3l-2 4"/>`,
};

const cache = new Map(); // key `${locationId}:${date}` -> Promise<Weather|null>

export function weatherIconSvg(kind, size = 18) {
  const paths = ICONS[kind] || ICONS.cloud;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export function getWeather(locationId, dateISO) {
  const coords = LOCATION_COORDS[locationId];
  if (!coords || !dateISO) return Promise.resolve(null);
  const key = `${locationId}:${dateISO}`;
  if (cache.has(key)) return cache.get(key);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude",  coords.lat);
  url.searchParams.set("longitude", coords.lon);
  url.searchParams.set("daily",     "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone",  "Europe/London");
  url.searchParams.set("start_date", dateISO);
  url.searchParams.set("end_date",   dateISO);

  const p = fetch(url.toString())
    .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then((data) => {
      const d = data?.daily;
      if (!d || !d.time?.length) return null;
      const code = d.weather_code?.[0];
      const tMax = d.temperature_2m_max?.[0];
      const tMin = d.temperature_2m_min?.[0];
      const meta = WMO[code] || { label: "Forecast", kind: "cloud" };
      return {
        locationId,
        locationLabel: coords.label,
        date: dateISO,
        code,
        tempMax: typeof tMax === "number" ? Math.round(tMax) : null,
        tempMin: typeof tMin === "number" ? Math.round(tMin) : null,
        label: meta.label,
        kind: meta.kind,
        iconSvg: weatherIconSvg(meta.kind, 22),
      };
    })
    .catch(() => null);

  cache.set(key, p);
  return p;
}
