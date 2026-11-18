import { useEffect, useState } from "react";
import { config } from "@/config";
import { GoogleMap, loadGoogleMaps } from "./GoogleMap";
import { LeafletMap } from "./LeafletMap";
import type { MapProps } from "./mapShared";

type Engine = "loading" | "google" | "leaflet";

/**
 * Google Maps when VITE_GOOGLE_MAPS_API_KEY is set and works;
 * otherwise (no key, no internet to Google, key rejected) the OpenStreetMap map.
 */
export function MapView(props: MapProps) {
  const [engine, setEngine] = useState<Engine>(config.googleMapsApiKey ? "loading" : "leaflet");

  useEffect(() => {
    if (!config.googleMapsApiKey) return;
    let cancelled = false;
    loadGoogleMaps(config.googleMapsApiKey)
      .then(() => { if (!cancelled) setEngine("google"); })
      .catch(() => { if (!cancelled) setEngine("leaflet"); });
    return () => { cancelled = true; };
  }, []);

  if (engine === "loading") return <div className="h-full w-full bg-[#eef0f4]" aria-hidden="true" />;
  if (engine === "google") return <GoogleMap {...props} onFailure={() => setEngine("leaflet")} />;
  return <LeafletMap {...props} />;
}
