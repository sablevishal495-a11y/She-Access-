import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "@/config";
import { formatPrice, getStatus, STATUS_META } from "@/lib/stock";
import type { Coordinates, MachineWithDistance } from "@/types";

interface Props {
  center: Coordinates;
  user: Coordinates | null;
  machines: MachineWithDistance[];
  selectedId: string | null;
  focusKey: number;
  focusMode: "overview" | "me";
  onSelect: (id: string | null) => void;
}

function machineIcon(machine: MachineWithDistance, selected: boolean): L.DivIcon {
  const root = document.createElement("div");
  root.className = `map-pin map-pin--${getStatus(machine)}${selected ? " map-pin--selected" : ""}`;

  const dot = document.createElement("span");
  dot.className = "map-pin__dot";
  dot.setAttribute("aria-hidden", "true");

  const price = document.createElement("span");
  price.textContent = formatPrice(machine.pricePerPad, machine.currency);
  root.append(dot, price);

  return L.divIcon({
    className: "map-pin-icon",
    html: root,
    iconSize: [86, 48],
    iconAnchor: [43, 46],
  });
}

const userIcon = L.divIcon({
  className: "map-user-icon",
  html: '<span class="map-user-dot"></span>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export function MapView({ center, user, machines, selectedId, focusKey, focusMode, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      tapHold: false,
    }).setView([center.lat, center.lng], 14);
    const layer = L.layerGroup().addTo(map);
    const tiles = L.tileLayer(config.mapTileUrl, {
      attribution: config.mapAttribution,
      maxZoom: 19,
    }).addTo(map);

    let failedTiles = 0;
    tiles.on("tileerror", () => {
      failedTiles += 1;
      if (failedTiles >= 3) setTilesUnavailable(true);
    });
    tiles.on("tileload", () => {
      failedTiles = 0;
      setTilesUnavailable(false);
    });
    map.on("click", () => onSelectRef.current(null));
    mapRef.current = map;
    markersRef.current = layer;

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => map.invalidateSize({ pan: false }))
      : null;
    observer?.observe(containerRef.current);
    const frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // Create the map once; later effects update its markers and camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();

    machines.forEach((machine) => {
      const status = getStatus(machine);
      const marker = L.marker([machine.location.lat, machine.location.lng], {
        icon: machineIcon(machine, machine.id === selectedId),
        title: `${machine.name}, ${STATUS_META[status].label}, ${formatPrice(machine.pricePerPad, machine.currency)}`,
        keyboard: true,
        zIndexOffset: machine.id === selectedId ? 1000 : 0,
      });
      marker.on("click", () => onSelectRef.current(machine.id));
      layer.addLayer(marker);
    });

    if (user) {
      layer.addLayer(L.marker([user.lat, user.lng], {
        icon: userIcon,
        title: "Your location",
        keyboard: false,
        interactive: false,
        zIndexOffset: 900,
      }));
    }
  }, [machines, selectedId, user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusKey === 0) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (focusMode === "me") {
      map.flyTo([center.lat, center.lng], 16, { animate: !reducedMotion, duration: 0.55 });
      return;
    }

    const points: L.LatLngTuple[] = [[center.lat, center.lng]];
    machines.forEach((machine) => points.push([machine.location.lat, machine.location.lng]));
    map.fitBounds(L.latLngBounds(points), {
      padding: [48, 48],
      maxZoom: 15,
      animate: !reducedMotion,
    });
  }, [center.lat, center.lng, focusKey, focusMode, machines]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = machines.find((machine) => machine.id === selectedId);
    if (!map || !selected) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo([selected.location.lat, selected.location.lng], Math.max(15, map.getZoom()), {
      animate: !reducedMotion,
      duration: 0.5,
    });
  }, [machines, selectedId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Map of nearby sanitary pad vending machines" />
      {tilesUnavailable && (
        <p className="map-tile-notice" role="status">Map background is unavailable. You can still use the pins and list.</p>
      )}
    </div>
  );
}