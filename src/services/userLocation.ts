/**
 * App-wide "where is the user" state.
 *
 * The app asks for location as soon as it opens (see App.tsx), so by the time
 * the user has typed her name the dashboard can already sort machines by distance.
 */
import { useEffect, useState } from "react";
import { getUserLocation, LocationError, type LocationIssue } from "@/services/location";
import type { Coordinates } from "@/types";

export interface UserLocationState {
  status: "idle" | "locating" | "ready" | "error";
  coords: Coordinates | null;
  issue: LocationIssue | null;
}

let state: UserLocationState = { status: "idle", coords: null, issue: null };
const listeners = new Set<(next: UserLocationState) => void>();
let inFlight: Promise<void> | null = null;

function set(next: Partial<UserLocationState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

/** Asks for permission (first time) and reads the current position. Safe to call repeatedly. */
export function requestUserLocation(): Promise<void> {
  if (inFlight) return inFlight;
  set({ status: "locating", issue: null });
  inFlight = getUserLocation()
    .then((coords) => set({ status: "ready", coords, issue: null }))
    .catch((error) => set({
      status: "error",
      issue: error instanceof LocationError ? error.reason : "unavailable",
    }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useUserLocation(): UserLocationState {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    return () => { listeners.delete(setCurrent); };
  }, []);
  return current;
}
