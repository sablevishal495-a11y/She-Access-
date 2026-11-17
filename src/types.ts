export interface Coordinates {
  lat: number;
  lng: number;
}

/** "unknown" = the API did not report stock for this machine. */
export type MachineStatus = "available" | "low" | "empty" | "offline" | "unknown";

/** One product slot in a multi-product machine. */
export interface MachineProduct {
  name: string;
  price: number | null;
  stock: number | null;
  capacity: number | null;
}

/**
 * A vending machine as the app uses it. Built from the API response in
 * `services/api/api.ts` (see `parseMachine`). Fields the API does not send are null.
 */
export interface VendingMachine {
  id: string;
  name: string;
  address: string;
  /** Null when the API has no coordinates for this machine (it is then left off the map). */
  location: Coordinates | null;
  /** Price of ONE sanitary napkin, in `currency` units. */
  pricePerPad: number | null;
  /** ISO 4217 code, e.g. "INR". */
  currency: string;
  /** Sanitary napkins currently in the machine. */
  stock: number | null;
  /** Maximum sanitary napkins the machine can hold. */
  capacity: number | null;
  /** False when the machine is reported offline / inactive. */
  online: boolean;
  /** Human readable, e.g. "6:00 AM – 10:00 PM" or "24 hours". */
  openHours: string | null;
  /** ISO timestamp of the last refill. */
  lastRestockedAt: string | null;
  /** When the machine last reported in (heartbeat). */
  lastSeenAt: string | null;
  /** What the machine sells, e.g. "Napkin". */
  productName: string | null;
  /** Product slots for multi-product machines (empty for single-product ones). */
  products: MachineProduct[];
}

export type MachineWithDistance = VendingMachine & { distanceKm: number | null };

export interface MachinePage {
  machines: VendingMachine[];
  /** 0-based page number that was returned. */
  page: number;
  /** True when there are no further pages. */
  last: boolean;
  /** Total machines matching the query, when the API reports it. */
  total: number | null;
}

export interface User {
  id: string;
  name: string;
}

/** Signed-in user, kept on the device. There is no server login. */
export interface Session {
  user: User;
}
