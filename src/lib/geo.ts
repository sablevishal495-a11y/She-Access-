import type { Coordinates } from "@/types";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in km. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Move a point by a number of metres north / east (good enough for short distances). */
export function offsetMeters(
  origin: Coordinates,
  northMeters: number,
  eastMeters: number,
): Coordinates {
  const dLat = northMeters / 111_320;
  const dLng = eastMeters / (111_320 * Math.cos(toRad(origin.lat)));
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Opens Google Maps (or the user's maps app) with walking directions. */
export function directionsUrl(destination: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=walking`;
}
