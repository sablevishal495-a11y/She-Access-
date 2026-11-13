import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import type { Coordinates } from "@/types";

export type LocationIssue = "denied" | "unavailable" | "timeout";

export class LocationError extends Error {
  reason: LocationIssue;
  constructor(reason: LocationIssue) {
    super(`Location ${reason}`);
    this.name = "LocationError";
    this.reason = reason;
  }
}

function classify(error: unknown): LocationError {
  if (error instanceof LocationError) return error;
  const e = error as { code?: number | string; message?: string } | undefined;
  const message = (e?.message ?? "").toLowerCase();
  if (e?.code === 1 || message.includes("denied") || message.includes("permission")) {
    return new LocationError("denied");
  }
  if (e?.code === 3 || message.includes("timeout") || message.includes("timed out")) {
    return new LocationError("timeout");
  }
  return new LocationError("unavailable");
}

async function ensurePermission(): Promise<void> {
  // Browsers ask for permission on their own inside getCurrentPosition().
  if (!Capacitor.isNativePlatform()) return;
  let status = await Geolocation.checkPermissions();
  if (status.location !== "granted" && status.coarseLocation !== "granted") {
    status = await Geolocation.requestPermissions({
      permissions: ["location", "coarseLocation"],
    });
  }
  if (status.location !== "granted" && status.coarseLocation !== "granted") {
    throw new LocationError("denied");
  }
}

export async function getUserLocation(): Promise<Coordinates> {
  try {
    await ensurePermission();
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (first) {
      // Indoors the GPS can be slow: retry once with network-based location.
      if (classify(first).reason === "denied") throw first;
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 120_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch (error) {
    throw classify(error);
  }
}
