/**
 * SHE-ACCESS API layer
 * ---------------------------------------------------------------------------
 * Every network call in the app goes through this file, so wiring the real
 * backend only means setting VITE_API_BASE_URL / VITE_API_KEY (see .env.example).
 *
 * While VITE_API_BASE_URL is empty the app runs in DEMO MODE with placeholder
 * data and the fixed OTP `123456`.
 *
 * Expected backend contract (change the paths below if yours differ):
 *
 *   POST {base}/auth/otp/send     body: { phone }                      -> { requestId, expiresInSec }
 *   POST {base}/auth/otp/verify   body: { phone, otp, requestId }      -> { token, user: { id, phone, name? } }
 *   GET  {base}/machines/nearby   ?lat=&lng=&radiusKm=                 -> { machines: VendingMachine[] }
 *
 * Every request carries:   x-api-key: <VITE_API_KEY>
 * Authenticated requests:  Authorization: Bearer <token>
 */
import { config, DEMO_OTP, isMockApi } from "@/config";
import { haversineKm } from "@/lib/geo";
import { loadSession } from "./session";
import type {
  Coordinates,
  OtpRequestResult,
  Session,
  VendingMachine,
} from "@/types";
import { buildMockMachines } from "../mockData";

/* ------------------------------------------------------------------ errors */

export class ApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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

let onUnauthorized: (() => void) | null = null;

/** Called when the backend answers 401 so the app can send the user back to login. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number>;
  auth?: boolean;
  handleUnauthorized?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = false, handleUnauthorized = true } = opts;

  let url = `${config.apiBaseUrl}${path}`;
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    );
    url += `?${qs.toString()}`;
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (config.apiKey) headers["x-api-key"] = config.apiKey;
  if (auth) {
    const token = loadSession()?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* empty or non-JSON body */
    }

    if (!res.ok) {
      if (res.status === 401 && auth && handleUnauthorized) onUnauthorized?.();
      const payload = data && typeof data === "object"
        ? data as { message?: unknown; code?: unknown }
        : {};
      throw new ApiError(
        (typeof payload.message === "string" && payload.message) ||
          (res.status >= 500
            ? "Our servers are having trouble. Please try again shortly."
            : "Request failed. Please try again."),
        res.status,
        typeof payload.code === "string" ? payload.code : undefined,
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseMachine(value: unknown): VendingMachine {
  const invalid = () => new ApiError("Machine data is temporarily unavailable. Please try again.");
  if (!isRecord(value) || !isRecord(value.location)) throw invalid();
  const location = value.location;
  if (
    typeof value.id !== "string" || !value.id ||
    typeof value.name !== "string" || !value.name ||
    typeof value.address !== "string" ||
    typeof location.lat !== "number" || !Number.isFinite(location.lat) || Math.abs(location.lat) > 90 ||
    typeof location.lng !== "number" || !Number.isFinite(location.lng) || Math.abs(location.lng) > 180 ||
    typeof value.pricePerPad !== "number" || !Number.isFinite(value.pricePerPad) || value.pricePerPad < 0 ||
    typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency) ||
    typeof value.stock !== "number" || !Number.isInteger(value.stock) || value.stock < 0 ||
    typeof value.capacity !== "number" || !Number.isInteger(value.capacity) || value.capacity <= 0 ||
    value.stock > value.capacity ||
    typeof value.online !== "boolean" ||
    typeof value.openHours !== "string" ||
    typeof value.lastRestockedAt !== "string" || !Number.isFinite(Date.parse(value.lastRestockedAt))
  ) throw invalid();

  return {
    id: value.id,
    name: value.name,
    address: value.address,
    location: { lat: location.lat, lng: location.lng },
    pricePerPad: value.pricePerPad,
    currency: value.currency,
    stock: value.stock,
    capacity: value.capacity,
    online: value.online,
    openHours: value.openHours,
    lastRestockedAt: value.lastRestockedAt,
    sample: value.sample === true,
  };
}

/* ---------------------------------------------------------------- endpoints */

/** Step 1 of login: ask the backend to SMS an OTP to `phone` (E.164). */
export async function sendOtp(phone: string): Promise<OtpRequestResult> {
  if (isMockApi) {
    await sleep(700);
    return { requestId: `demo-${Date.now()}`, expiresInSec: 300 };
  }
  const result = await request<unknown>("/auth/otp/send", {
    method: "POST",
    body: { phone },
  });
  if (!isRecord(result) || typeof result.requestId !== "string" || !result.requestId) {
    throw new ApiError("The server couldn't start sign-in. Please try again.");
  }
  return { requestId: result.requestId, expiresInSec: typeof result.expiresInSec === "number" ? result.expiresInSec : 300 };
}

/** Step 2 of login: exchange the OTP for a session token. */
export async function verifyOtp(params: {
  phone: string;
  otp: string;
  requestId: string;
}): Promise<Session> {
  if (isMockApi) {
    await sleep(800);
    if (params.otp !== DEMO_OTP) {
      throw new ApiError(
        "That code isn't right. Please check it and try again.",
        400,
        "INVALID_OTP",
      );
    }
    return {
      token: `demo-token-${Date.now()}`,
      user: { id: "demo-user", phone: params.phone },
    };
  }
  const result = await request<unknown>("/auth/otp/verify", {
    method: "POST",
    body: params,
  });
  if (
    !isRecord(result) ||
    typeof result.token !== "string" || !result.token ||
    !isRecord(result.user) ||
    typeof result.user.id !== "string" ||
    typeof result.user.phone !== "string"
  ) {
    throw new ApiError("The server couldn't finish sign-in. Please try again.");
  }
  return { token: result.token, user: { id: result.user.id, phone: result.user.phone, name: typeof result.user.name === "string" ? result.user.name : undefined } };
}

/** Machines within `radiusKm` of `origin`, including live price and stock. */
export async function fetchNearbyMachines(
  origin: Coordinates,
  radiusKm: number,
): Promise<VendingMachine[]> {
  if (isMockApi) {
    await sleep(600);
    return buildMockMachines(origin).filter(
      (m) => haversineKm(origin, m.location) <= radiusKm,
    );
  }
  const res = await request<unknown>("/machines/nearby", {
    query: { lat: origin.lat, lng: origin.lng, radiusKm },
    auth: true,
  });
  if (!isRecord(res) || !Array.isArray(res.machines)) {
    throw new ApiError("The server didn't return machine data. Please try again.");
  }
  return res.machines.map(parseMachine);
}

/** Best-effort server-side token revocation; local sign-out still works if offline. */
export async function revokeSession(): Promise<void> {
  if (isMockApi) return;
  await request<unknown>("/auth/logout", {
    method: "POST",
    auth: true,
    handleUnauthorized: false,
  });
}
