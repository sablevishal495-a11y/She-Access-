/**
 * SHE-ACCESS API layer
 * ---------------------------------------------------------------------------
 * Every network call in the app goes through this file.
 *
 * Set VITE_API_BASE_URL in `.env` to your API host, e.g. https://api.example.com
 * (no trailing slash, no /api). Then:
 *
 *   GET {base}/api/Machine/public/all-machines                     -> all machines
 *   GET {base}/api/Machine/public/all-machines?page=0&size=10      -> one page
 *   GET {base}/api/Machine/public/all-machines?search=pune         -> by name / location
 *
 * To add another endpoint, add a path to ENDPOINTS and a small function below
 * that calls `request()`.
 */
import { config } from "@/config";
import type { MachinePage, MachineProduct, VendingMachine } from "@/types";

export const ENDPOINTS = {
  allMachines: "/api/Machine/public/all-machines",
} as const;

/* ------------------------------------------------------------------ errors */

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Turns any thrown value into a message that is safe to show to users. */
export function toUserMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out. Please check your connection.";
  }
  if (error instanceof TypeError) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  return fallback;
}

/* ------------------------------------------------------------ http client */

interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!config.apiBaseUrl) {
    throw new ApiError("The app is missing its server address (VITE_API_BASE_URL).");
  }

  let url = `${config.apiBaseUrl}${path}`;
  if (opts.query) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    }
    const text = qs.toString();
    if (text) url += `?${text}`;
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.apiKey) headers["x-api-key"] = config.apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  opts.signal?.addEventListener("abort", () => controller.abort());

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (!res.ok) {
      const message = isRecord(data) && typeof data.message === "string" ? data.message : "";
      throw new ApiError(
        message ||
          (res.status >= 500
            ? "Our servers are having trouble. Please try again shortly."
            : "Request failed. Please try again."),
        res.status,
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------- parsing helpers */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** First value among `keys` (supports "a.b" paths) that is not null/undefined/"". */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    let current: unknown = obj;
    for (const part of key.split(".")) {
      current = isRecord(current) ? current[part] : undefined;
    }
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return undefined;
}

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function toStr(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function toBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "active", "online", "1", "yes", "working", "on"].includes(v)) return true;
    if (["false", "inactive", "offline", "0", "no", "down", "off", "maintenance"].includes(v)) return false;
  }
  return null;
}

/* ------------------------------------------------------------- field mapping */
/*
 * Each list is the field names tried, in order, for one app field.
 * If your API uses a different name, put it first in the matching list.
 */
const FIELDS = {
  id: ["id", "machineId", "_id", "machineCode", "code", "serialNumber"],
  name: ["name", "machineName", "title", "machineCode"],
  address: ["address", "location", "fullAddress", "locationName", "area", "city"],
  lat: ["latitude", "lat", "location.lat", "location.latitude", "coordinates.lat"],
  lng: ["longitude", "lng", "lon", "long", "location.lng", "location.longitude", "coordinates.lng"],
  price: ["pricePerPad", "price", "padPrice", "unitPrice", "cost"],
  currency: ["currency"],
  stock: ["stock", "currentStock", "availableStock", "padsAvailable", "quantity", "availableQuantity", "remaining"],
  capacity: ["totalStockCapacity", "capacity", "maxCapacity", "totalCapacity", "maxStock"],
  geo: ["geoMapLocation", "geoLocation", "coordinates"],
  online: ["status", "online", "isOnline", "active", "isActive", "machineStatus"],
  openHours: ["openHours", "workingHours", "timings", "timing", "operatingHours"],
  restocked: ["lastRestockedAt", "lastRefilledAt", "lastRefillDate"],
  lastSeen: ["lastHeartBeatTime", "lastHeartbeatTime", "lastSeenAt"],
  productName: ["productName", "product"],
  machineType: ["machineType", "type"],
} as const;

/** Builds an address line from separate parts when there is no single address field. */
function addressFrom(raw: Record<string, unknown>): string {
  const direct = pick(raw, [...FIELDS.address]);
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const parts = ["street", "area", "landmark", "city", "district", "state", "pincode"]
    .map((key) => toStr(raw[key]))
    .filter(Boolean);
  return parts.join(", ");
}

/** "21.18, 79.03" -> { lat, lng } */
function parseLatLngString(value: unknown): { lat: number; lng: number } | null {
  if (typeof value !== "string") return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || !parts.every(Number.isFinite)) return null;
  return { lat: parts[0], lng: parts[1] };
}

/** Real timestamps only; the API uses 0001-01-01 for "never". */
function toDate(value: unknown): string | null {
  const text = toStr(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) && new Date(time).getFullYear() >= 2000 ? text : null;
}

/** Reads p1Name/p1Price/p1Stock/p1Capacity ... p9 slots of multi-product machines. */
function productsFrom(raw: Record<string, unknown>): MachineProduct[] {
  const products: MachineProduct[] = [];
  for (let i = 1; i <= 9; i += 1) {
    const name = toStr(raw[`p${i}Name`]);
    if (!name) continue;
    products.push({
      name,
      price: toNum(raw[`p${i}Price`]),
      stock: toNum(raw[`p${i}Stock`]),
      capacity: toNum(raw[`p${i}Capacity`]),
    });
  }
  return products;
}

const sum = (values: (number | null)[]) =>
  values.every((v) => v !== null) && values.length ? values.reduce<number>((a, b) => a + (b ?? 0), 0) : null;

export function parseMachine(value: unknown, index: number): VendingMachine | null {
  if (!isRecord(value)) return null;
  const code = toStr(pick(value, [...FIELDS.name]));
  if (!code) return null;
  const place = addressFrom(value);
  const productName = toStr(pick(value, [...FIELDS.productName]));
  // Users see the place, not the machine code.
  const name = place || (productName && /napkin|pad/i.test(productName) ? "Sanitary napkin machine" : "Vending machine");

  const geo = parseLatLngString(pick(value, [...FIELDS.geo]));
  const lat = geo?.lat ?? toNum(pick(value, [...FIELDS.lat]));
  const lng = geo?.lng ?? toNum(pick(value, [...FIELDS.lng]));
  const hasLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

  const products = productsFrom(value);
  const stock = toNum(pick(value, [...FIELDS.stock])) ?? sum(products.map((p) => p.stock));
  let capacity = toNum(pick(value, [...FIELDS.capacity]));
  if (capacity === null || capacity <= 0) capacity = sum(products.map((p) => p.capacity));
  const rawPrice = toNum(pick(value, [...FIELDS.price]));
  const productPrices = products.map((p) => p.price).filter((p): p is number => p !== null && p > 0);
  const price = rawPrice !== null && rawPrice > 0
    ? rawPrice
    : productPrices.length ? Math.min(...productPrices) : null;
  const currency = toStr(pick(value, [...FIELDS.currency]))?.toUpperCase();

  return {
    id: toStr(pick(value, [...FIELDS.id])) ?? `machine-${index}-${code}`,
    name,
    address: "",
    code,
    multiProduct: products.length > 0 || /multi/i.test(toStr(pick(value, [...FIELDS.machineType])) ?? ""),
    location: hasLocation ? { lat, lng } : null,
    pricePerPad: price,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "INR",
    stock: stock !== null ? Math.max(0, Math.round(stock)) : null,
    capacity: capacity !== null && capacity > 0 ? Math.round(capacity) : null,
    online: toBool(pick(value, [...FIELDS.online])) ?? true,
    openHours: toStr(pick(value, [...FIELDS.openHours])),
    lastRestockedAt: toDate(pick(value, [...FIELDS.restocked])),
    lastSeenAt: toDate(pick(value, [...FIELDS.lastSeen])),
    productName,
    products,
  };
}

/**
 * Finds the list of machines in the response. Handles:
 *   [ ...machines ]
 *   { content: [...] , totalElements, last }        (Spring Boot Page)
 *   { data: [...] } / { data: { content: [...] } } / { machines: [...] }
 */
function extractList(res: unknown): { items: unknown[]; meta: Record<string, unknown> } {
  if (Array.isArray(res)) return { items: res, meta: {} };
  if (!isRecord(res)) return { items: [], meta: {} };
  for (const key of ["content", "machines", "data", "items", "results", "result", "records"]) {
    const inner = res[key];
    if (Array.isArray(inner)) return { items: inner, meta: res };
    if (isRecord(inner)) {
      const nested = extractList(inner);
      if (nested.items.length || Object.keys(nested.meta).length) {
        return { items: nested.items, meta: { ...res, ...nested.meta } };
      }
    }
  }
  return { items: [], meta: res };
}

/* ---------------------------------------------------------------- endpoints */

/** One page of machines, optionally filtered by name or location. */
export async function fetchMachines(params: {
  page?: number;
  size?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<MachinePage> {
  const page = params.page ?? 0;
  const size = params.size ?? config.pageSize;
  const res = await request<unknown>(ENDPOINTS.allMachines, {
    query: { page, size, search: params.search?.trim() || undefined },
    signal: params.signal,
  });

  const { items, meta } = extractList(res);
  if (!Array.isArray(res) && !isRecord(res)) {
    throw new ApiError("The server didn't return machine data. Please try again.");
  }
  const machines = items
    .map((item, i) => parseMachine(item, page * size + i))
    // Multi-product machines are not shown to users.
    .filter((m): m is VendingMachine => m !== null && !m.multiProduct);

  const total = toNum(pick(meta, ["totalElements", "total", "totalCount", "count", "page.totalElements"]));
  const totalPages = toNum(pick(meta, ["totalPages", "page.totalPages"]));
  const pageSize = toNum(pick(meta, ["size", "pageSize"])) ?? size;
  const lastFlag = toBool(pick(meta, ["last"]));
  const last =
    lastFlag ??
    (totalPages !== null ? page + 1 >= totalPages : total !== null ? (page + 1) * pageSize >= total : items.length < pageSize);

  return { machines, page, last, total };
}

/**
 * Every machine matching `search`, reading page after page.
 * Needed so "nearest first" really compares all machines, not just one page.
 */
export async function fetchAllMachines(params: { search?: string; signal?: AbortSignal } = {}): Promise<VendingMachine[]> {
  const all = new Map<string, VendingMachine>();
  const size = 100;
  for (let page = 0; page < 50; page += 1) {
    const result = await fetchMachines({ page, size, search: params.search, signal: params.signal });
    result.machines.forEach((machine) => all.set(machine.id, machine));
    if (result.last) break;
  }
  return [...all.values()];
}
