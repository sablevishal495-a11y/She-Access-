import { formatPrice, getStatus } from "@/lib/stock";
import type { Coordinates, MachineWithDistance } from "@/types";

/** Props shared by the Google and Leaflet maps. */
export interface MapProps {
  center: Coordinates;
  user: Coordinates | null;
  /** Already sorted nearest-first when the user's location is known. */
  machines: MachineWithDistance[];
  selectedId: string | null;
  focusKey: number;
  focusMode: "overview" | "me";
  onSelect: (id: string | null) => void;
}

export type Located = MachineWithDistance & { location: Coordinates };

export const hasLocation = (machine: MachineWithDistance): machine is Located => machine.location !== null;

/** The price pill used as a map pin (same look on both maps). */
export function pinElement(machine: Located, selected: boolean): HTMLDivElement {
  const root = document.createElement("div");
  root.className = `map-pin map-pin--${getStatus(machine)}${selected ? " map-pin--selected" : ""}`;

  const dot = document.createElement("span");
  dot.className = "map-pin__dot";
  dot.setAttribute("aria-hidden", "true");

  const price = document.createElement("span");
  price.textContent = machine.pricePerPad !== null ? formatPrice(machine.pricePerPad, machine.currency) : "•";
  root.append(dot, price);
  return root;
}

/** How many of the nearest machines to keep in view next to the user. */
const NEAREST_IN_VIEW = 3;

/**
 * Points the camera should frame.
 * - "me": the user plus her nearest few machines (so pins are visible, not just a blue dot).
 * - "overview": every machine (plus the user, when known).
 */
export function focusPoints(
  machines: Located[],
  user: Coordinates | null,
  center: Coordinates,
  mode: "overview" | "me",
): Coordinates[] {
  if (mode === "me" && user) {
    return [user, ...machines.slice(0, NEAREST_IN_VIEW).map((machine) => machine.location)];
  }
  const points = machines.map((machine) => machine.location);
  if (user) points.push(user);
  if (points.length === 0) points.push(center);
  return points;
}
