/**
 * Turns the user's coordinates into a short place name, e.g. "Shree Nagar, Nagpur",
 * using OpenStreetMap's free Nominatim service (no key needed).
 * Usage policy: at most 1 request per second, with an identifying User-Agent;
 * results are cached, so a session normally makes only one or two requests.
 */
import type { Coordinates } from "@/types";

const cache = new Map<string, string | null>();

function key({ lat, lng }: Coordinates): string {
  // ~100 m grid, so small GPS jitter does not trigger a new lookup.
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function shortName(address: Record<string, string | undefined>): string | null {
  const area = address.neighbourhood || address.suburb || address.quarter || address.residential || address.road || address.hamlet;
  const city = address.city || address.town || address.village || address.municipality || address.county || address.state_district;
  const parts = [area, city].filter((part, i, all): part is string => !!part && all.indexOf(part) === i);
  return parts.length ? parts.join(", ") : null;
}

export async function lookupPlaceName(coords: Coordinates): Promise<string | null> {
  const k = key(coords);
  if (cache.has(k)) return cache.get(k) ?? null;

  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=en" +
    `&lat=${coords.lat}&lon=${coords.lng}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SHE-ACCESS-app/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string | undefined> };
    const name = data.address ? shortName(data.address) : null;
    cache.set(k, name);
    return name;
  } catch {
    return null; // offline or blocked: the app just shows "Your current location"
  } finally {
    clearTimeout(timer);
  }
}
