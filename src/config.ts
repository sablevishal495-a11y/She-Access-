const env = import.meta.env;

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bounded(value: string | undefined, fallback: number, min: number, max: number): number {
  const result = num(value, fallback);
  return result >= min && result <= max ? result : fallback;
}

export const config = {
  appName: "SHE-ACCESS",

  /** Backend base URL (no trailing slash). Empty string = demo mode. */
  apiBaseUrl: (env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, ""),
  /** Public API key, sent as `x-api-key`. */
  apiKey: (env.VITE_API_KEY ?? "").trim(),
  requestTimeoutMs: 15_000,

  mapTileUrl:
    env.VITE_MAP_TILE_URL?.trim() ||
    "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  mapAttribution:
    env.VITE_MAP_ATTRIBUTION?.trim() ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles by HOT / OSM France',

  defaultLocation: {
    lat: bounded(env.VITE_DEFAULT_LAT, 28.6139, -85, 85),
    lng: bounded(env.VITE_DEFAULT_LNG, 77.209, -180, 180),
  },
  defaultLocationLabel: env.VITE_DEFAULT_LOCATION_LABEL?.trim() || "New Delhi",
  searchRadiusKm: bounded(env.VITE_SEARCH_RADIUS_KM, 5, 0.1, 100),

  countryCode: "+91",
  phoneLength: 10,
  otpLength: 6,
  otpResendSeconds: 30,
} as const;

/** True while no backend URL is configured: the app uses sample data. */
export const isMockApi = config.apiBaseUrl === "";

/** Also supports the optional local development backend, which does not send SMS. */
export const isDemoMode = isMockApi || env.VITE_DEMO_MODE === "true";

const configuredOtp = env.VITE_DEMO_OTP?.trim() ?? "";
export const DEMO_OTP = /^\d{6}$/.test(configuredOtp) ? configuredOtp : "123456";
