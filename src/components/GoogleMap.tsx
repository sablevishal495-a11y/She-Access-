import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "@/config";
import { getStatus, STATUS_META } from "@/lib/stock";
import { focusPoints, hasLocation, pinElement, type MapProps } from "./mapShared";

/* --------------------------------------------------------------- loading */

const CALLBACK = "__sheAccessGoogleMapsReady";
let loading: Promise<void> | null = null;

/** Loads the Google Maps JavaScript API once. Rejects if the script or the key fails. */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window.google !== "undefined" && typeof window.google.maps?.importLibrary === "function") return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w[CALLBACK] = () => resolve();
    // Google calls this when the key is invalid, restricted or has no billing.
    w.gm_authFailure = () => reject(new Error("Google Maps rejected the API key"));
    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&loading=async&libraries=marker&callback=${CALLBACK}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load Google Maps"));
    };
    document.head.append(script);
  });
  return loading;
}

/* ------------------------------------------------------------------- map */

interface Props extends MapProps {
  /** Called if Google rejects the key after the map was created. */
  onFailure: () => void;
}

export function GoogleMap({ center, user, machines: allMachines, selectedId, focusKey, focusMode, onSelect, onFailure }: Props) {
  const machines = useMemo(() => allMachines.filter(hasLocation), [allMachines]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onFailureRef = useRef(onFailure);
  onSelectRef.current = onSelect;
  onFailureRef.current = onFailure;
  const refitRef = useRef<(() => void) | null>(null);
  /** Bumped when the async map is created, so the effects below run again. */
  const [ready, setReady] = useState(0);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (window as unknown as Record<string, unknown>).gm_authFailure = () => onFailureRef.current();

    void (async () => {
      const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
        google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
        google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
      ]);
      if (cancelled || !containerRef.current) return;
      markerClassRef.current = AdvancedMarkerElement;
      const map = new Map(containerRef.current, {
        center,
        zoom: 13,
        mapId: config.googleMapId,
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false,
        gestureHandling: "greedy",
      });
      map.addListener("click", () => onSelectRef.current(null));
      mapRef.current = map;
      setReady((n) => n + 1);
    })().catch(() => onFailureRef.current());

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => { marker.map = null; });
      markersRef.current = [];
      mapRef.current = null;
    };
    // Created once; later effects move the camera and markers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-zoom when the map first gets a real size (it can start at 0×0 behind the sheet).
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let wasTiny = true;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const tiny = width < 50 || height < 50;
      if (wasTiny && !tiny) refitRef.current?.();
      wasTiny = tiny;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Markers.
  useEffect(() => {
    const map = mapRef.current;
    const Marker = markerClassRef.current;
    if (!map || !Marker) return;
    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = [];

    machines.forEach((machine) => {
      const selected = machine.id === selectedId;
      const marker = new Marker({
        map,
        position: machine.location,
        content: pinElement(machine, selected),
        title: `${machine.name}, ${STATUS_META[getStatus(machine)].label}`,
        zIndex: selected ? 1000 : 1,
        gmpClickable: true,
      });
      marker.addListener("click", () => onSelectRef.current(machine.id));
      markersRef.current.push(marker);
    });

    if (user) {
      const dot = document.createElement("span");
      dot.className = "map-user-dot";
      dot.style.transform = "translateY(50%)"; // centre the dot on the position
      markersRef.current.push(new Marker({ map, position: user, content: dot, title: "Your location", zIndex: 900 }));
    }
  }, [machines, selectedId, user, ready]);

  // Camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusKey === 0) return;
    const fit = () => {
      const points = focusPoints(machines, user, center, focusMode);
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(focusMode === "me" ? 16 : 14);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 56);
    };
    refitRef.current = fit;
    fit();
  }, [center, focusKey, focusMode, machines, user, ready]);

  // Selected machine.
  useEffect(() => {
    const map = mapRef.current;
    const selected = machines.find((machine) => machine.id === selectedId);
    if (!map || !selected) return;
    map.panTo(selected.location);
    if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
  }, [machines, selectedId, ready]);

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Map of nearby sanitary pad vending machines" />;
}
