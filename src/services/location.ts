import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import type { Coordinates } from "@/types";

/** denied = app permission refused; off = phone location / accuracy turned off. */
export type LocationIssue = "denied" | "off" | "unavailable" | "timeout";

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
  // "Request to enable location was denied" = the user declined turning on phone location / accuracy.
  if (e?.code === "OS-PLUG-GLOC-0009" || message.includes("enable location") || message.includes("location services") || message.includes("location disabled")) {
    return new LocationError("off");
  }
  if (e?.code === 1 || message.includes("permission")) {
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

/** Position from the web view's own geolocation (Android LocationManager): no Google "Location Accuracy" pop-up. */
function browserPosition(highAccuracy: boolean, timeout: number): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new LocationError("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 60_000 },
    );
  });
}

export async function getUserLocation(): Promise<Coordinates> {
  try {
    await ensurePermission();
    try {
      // GPS + network through the web view (no Google pop-up).
      return await browserPosition(true, 12_000);
    } catch (first) {
      if (classify(first).reason === "denied") throw first;
    }
    try {
      // Network-only position, in case GPS has no signal (e.g. indoors).
      return await browserPosition(false, 8_000);
    } catch (second) {
      if (classify(second).reason === "denied") throw second;
      // Fallback: the plugin. If phone location is off it asks the user to turn it on.
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch (error) {
    throw classify(error);
  }
}
