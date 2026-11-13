export interface Coordinates {
  lat: number;
  lng: number;
}

export type MachineStatus = "available" | "low" | "empty" | "offline";

/** Shape the backend should return for each vending machine. */
export interface VendingMachine {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  /** Price of ONE sanitary napkin, in `currency` units. */
  pricePerPad: number;
  /** ISO 4217 code, e.g. "INR". */
  currency: string;
  /** Sanitary napkins currently in the machine. */
  stock: number;
  /** Maximum sanitary napkins the machine can hold. */
  capacity: number;
  /** False when the machine has not reported in recently. */
  online: boolean;
  /** Human readable, e.g. "6:00 AM – 10:00 PM" or "24 hours". */
  openHours: string;
  /** ISO timestamp of the last refill. */
  lastRestockedAt: string;
  /** Sample data cannot be used for real-world directions. */
  sample?: boolean;
}

export type MachineWithDistance = VendingMachine & { distanceKm: number };

export interface User {
  id: string;
  /** E.164 format, e.g. +919876543210 */
  phone?: string;
  name?: string;
}

export interface Session {
  token: string;
  user: User;
  /** Guest access is only available when the app is running with sample data. */
  demo?: boolean;
}

export interface OtpRequestResult {
  requestId: string;
  expiresInSec: number;
}
