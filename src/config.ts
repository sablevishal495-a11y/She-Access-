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

  /** API host (no trailing slash, without /api), e.g. https://api.example.com */
  apiBaseUrl: (env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, ""),
  /** Optional API key, sent as `x-api-key` when set. */
  apiKey: (env.VITE_API_KEY ?? "").trim(),
  requestTimeoutMs: 15_000,
  /** Machines loaded per page. */
  pageSize: bounded(env.VITE_PAGE_SIZE, 20, 1, 200),

  mapTileUrl:
    env.VITE_MAP_TILE_URL?.trim() ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  /** Used for any tile the main server fails to deliver. */
  mapTileFallbackUrl:
    env.VITE_MAP_TILE_FALLBACK_URL?.trim() ||
    "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  mapAttribution:
    env.VITE_MAP_ATTRIBUTION?.trim() ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

  defaultLocation: {
    lat: bounded(env.VITE_DEFAULT_LAT, 21.1458, -85, 85),
    lng: bounded(env.VITE_DEFAULT_LNG, 79.0882, -180, 180),
  },
  defaultLocationLabel: env.VITE_DEFAULT_LOCATION_LABEL?.trim() || "Nagpur",

  nameMaxLength: 40,
} as const;
