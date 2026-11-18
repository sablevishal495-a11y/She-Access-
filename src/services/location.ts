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
function browserPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new LocationError("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export async function getUserLocation(): Promise<Coordinates> {
  try {
    await ensurePermission();
    try {
      return await browserPosition();
    } catch (first) {
      if (classify(first).reason === "denied") throw first;
      // Fallback: the plugin. If phone location is off it asks the user to turn it on.
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 15_000,
        maximumAge: 60_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch (error) {
    throw classify(error);
  }
}
