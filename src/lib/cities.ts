import { config } from "@/config";
import type { Coordinates } from "@/types";

export interface CityOption {
  id: string;
  label: string;
  coordinates: Coordinates;
}

const presets: CityOption[] = [
  { id: "mumbai", label: "Mumbai", coordinates: { lat: 19.076, lng: 72.8777 } },
  { id: "bengaluru", label: "Bengaluru", coordinates: { lat: 12.9716, lng: 77.5946 } },
  { id: "hyderabad", label: "Hyderabad", coordinates: { lat: 17.385, lng: 78.4867 } },
  { id: "bhopal", label: "Bhopal", coordinates: { lat: 23.2599, lng: 77.4126 } },
];

export const cities: CityOption[] = [
  { id: "default", label: config.defaultLocationLabel, coordinates: config.defaultLocation },
  ...presets.filter(
    (city) => city.label.toLowerCase() !== config.defaultLocationLabel.toLowerCase(),
  ),
];