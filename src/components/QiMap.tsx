import { useEffect, useRef } from "react";
import L from "leaflet";

type Props = {
  lat: number;
  lng: number;
  facingDeg: number | null;
  buildingName: string;
  waterPoint?: { lat: number; lng: number; name: string } | null;
};

const QiMap = ({ lat, lng, facingDeg, buildingName, waterPoint }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lng], 17);

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, subdomains: "abc" }
      ).addTo(mapInstance.current);

      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution("© OpenStreetMap")
        .addTo(mapInstance.current);
    }

    const map = mapInstance.current;
    map.eachLayer((layer) => {
      if ((layer as any)._url) return; // keep tile layer
      if ((layer as any).options?.pane === "markerPane" || layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    map.setView([lat, lng], 17);

    // House marker (sage dot)
    const houseIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:9999px;background:hsl(142 28% 38%);box-shadow:0 0 0 6px hsl(142 28% 38% / 0.18), 0 4px 14px hsl(142 28% 25% / 0.35);border:2px solid white;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([lat, lng], { icon: houseIcon, title: buildingName }).addTo(map);

    // 500m water radius
    L.circle([lat, lng], {
      radius: 500,
      color: "hsl(195 45% 55%)",
      weight: 1,
      fillColor: "hsl(195 45% 55%)",
      fillOpacity: 0.06,
      dashArray: "4 6",
    }).addTo(map);

    // Facing direction arrow
    if (facingDeg != null) {
      const dist = 60; // meters
      const rad = (facingDeg * Math.PI) / 180;
      const dLat = (Math.cos(rad) * dist) / 111320;
      const dLng = (Math.sin(rad) * dist) / (111320 * Math.cos((lat * Math.PI) / 180));
      const end: [number, number] = [lat + dLat, lng + dLng];

      L.polyline([[lat, lng], end], {
        color: "hsl(38 55% 55%)",
        weight: 4,
        opacity: 0.9,
        lineCap: "round",
      }).addTo(map);

      const arrowIcon = L.divIcon({
        className: "",
        html: `<div style="width:10px;height:10px;border-radius:9999px;background:hsl(38 55% 55%);border:2px solid white;box-shadow:0 2px 8px hsl(38 55% 30% / 0.4);"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      L.marker(end, { icon: arrowIcon }).addTo(map);
    }

    // Nearest water marker (if within visible-ish range)
    if (waterPoint) {
      const waterIcon = L.divIcon({
        className: "",
        html: `<div style="padding:4px 8px;border-radius:9999px;background:hsl(195 45% 55% / 0.95);color:white;font:500 11px Inter,sans-serif;white-space:nowrap;box-shadow:0 4px 12px hsl(195 45% 30% / 0.35);">${waterPoint.name}</div>`,
        iconSize: [0, 0],
      });
      L.marker([waterPoint.lat, waterPoint.lng], { icon: waterIcon }).addTo(map);
    }
  }, [lat, lng, facingDeg, buildingName, waterPoint]);

  useEffect(() => {
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-[340px] sm:h-[420px] rounded-2xl overflow-hidden shadow-soft border border-border"
      aria-label="Map of scanned location"
    />
  );
};

export default QiMap;
