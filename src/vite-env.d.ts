/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API host, e.g. https://api.example.com (no trailing slash, without /api). */
  readonly VITE_API_BASE_URL?: string;
  /** Optional API key sent in the `x-api-key` header. */
  readonly VITE_API_KEY?: string;
  /** Machines per page (default 20). */
  readonly VITE_PAGE_SIZE?: string;
  /** Google Maps JavaScript API key; empty = OpenStreetMap map. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Google Cloud Map ID for the map style (default DEMO_MAP_ID). */
  readonly VITE_GOOGLE_MAP_ID?: string;
  /** Leaflet tile URL template. */
  readonly VITE_MAP_TILE_URL?: string;
  /** Tile server used when a tile from the main one fails. */
  readonly VITE_MAP_TILE_FALLBACK_URL?: string;
  /** Attribution HTML shown on the map for the chosen tile provider. */
  readonly VITE_MAP_ATTRIBUTION?: string;
  /** Map centre used until the user shares their location. */
  readonly VITE_DEFAULT_LAT?: string;
  readonly VITE_DEFAULT_LNG?: string;
  readonly VITE_DEFAULT_LOCATION_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
