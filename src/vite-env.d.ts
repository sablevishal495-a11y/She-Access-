/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SHE-ACCESS backend, e.g. https://api.example.com/v1. Empty = demo (mock) mode. */
  readonly VITE_API_BASE_URL?: string;
  /** Public API key sent in the `x-api-key` header on every request. */
  readonly VITE_API_KEY?: string;
  /** Set to true when using the optional development backend (no SMS, sample data). */
  readonly VITE_DEMO_MODE?: string;
  /** Development-only code; must match the local backend's DEV_OTP when used. */
  readonly VITE_DEMO_OTP?: string;
  /** Leaflet tile URL template. */
  readonly VITE_MAP_TILE_URL?: string;
  /** Attribution HTML shown on the map for the chosen tile provider. */
  readonly VITE_MAP_ATTRIBUTION?: string;
  /** Fallback map centre when the user denies location access. */
  readonly VITE_DEFAULT_LAT?: string;
  readonly VITE_DEFAULT_LNG?: string;
  readonly VITE_DEFAULT_LOCATION_LABEL?: string;
  /** Search radius for nearby machines, in km. */
  readonly VITE_SEARCH_RADIUS_KM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
