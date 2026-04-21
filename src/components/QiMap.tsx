import { useEffect, useRef } from "react";
import L from "leaflet";

type AmenityMarker = {
  lat: number;
  lng: number;
  name: string;
  category: string;
};

type Props = {
  lat: number;
  lng: number;
  facingDeg: number | null;
  buildingName: string;
  waterPoint?: { lat: number; lng: number; name: string } | null;
  amenities?: AmenityMarker[];
  variant?: "luopan" | "radius";
  radiusM?: number;
};

const QiMap = ({ lat, lng, facingDeg, buildingName, waterPoint, amenities = [], variant = "luopan", radiusM = 500 }: Props) => {
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

    if (variant === "luopan") {
      // Luopan (feng shui compass) overlay — replaces the plain 500m radius circle
      const luopanRadii = [500, 380, 260, 150]; // meters, outer -> inner rings
      const luopanGold = "hsl(38 55% 55%)";
      const luopanSage = "hsl(142 28% 38%)";
      const luopanInk = "hsl(142 28% 20%)";

      // Outer ring — the 500m water boundary, now styled as the Luopan rim
      L.circle([lat, lng], {
        radius: luopanRadii[0],
        color: luopanGold,
        weight: 2,
        fillColor: luopanGold,
        fillOpacity: 0.05,
      }).addTo(map);

      // Inner concentric rings
      luopanRadii.slice(1).forEach((r, i) => {
        L.circle([lat, lng], {
          radius: r,
          color: i % 2 === 0 ? luopanSage : luopanGold,
          weight: 1,
          opacity: 0.55,
          fill: false,
          dashArray: i === 1 ? "2 4" : undefined,
        }).addTo(map);
      });

      // 24 spokes (Luopan's 24 Mountains) from center to outer ring
      const outerR = luopanRadii[0];
      const innerR = luopanRadii[luopanRadii.length - 1];
      for (let i = 0; i < 24; i++) {
        const angle = (i * 15 * Math.PI) / 180;
        const isCardinal = i % 6 === 0; // N, E, S, W
        const rStart = isCardinal ? 0 : innerR;
        const rEnd = outerR;
        const startLat = lat + (Math.cos(angle) * rStart) / 111320;
        const startLng =
          lng + (Math.sin(angle) * rStart) / (111320 * Math.cos((lat * Math.PI) / 180));
        const endLat = lat + (Math.cos(angle) * rEnd) / 111320;
        const endLng =
          lng + (Math.sin(angle) * rEnd) / (111320 * Math.cos((lat * Math.PI) / 180));
        L.polyline(
          [
            [startLat, startLng],
            [endLat, endLng],
          ],
          {
            color: isCardinal ? luopanInk : luopanSage,
            weight: isCardinal ? 1.2 : 0.6,
            opacity: isCardinal ? 0.8 : 0.35,
          }
        ).addTo(map);
      }

      // 8 Trigrams (Bagua) placed between the two outermost rings
      const trigrams = [
        { sym: "☰", name: "Qián", deg: 315 },
        { sym: "☵", name: "Kǎn", deg: 0 },
        { sym: "☶", name: "Gèn", deg: 45 },
        { sym: "☳", name: "Zhèn", deg: 90 },
        { sym: "☴", name: "Xùn", deg: 135 },
        { sym: "☲", name: "Lí", deg: 180 },
        { sym: "☷", name: "Kūn", deg: 225 },
        { sym: "☱", name: "Duì", deg: 270 },
      ];
      const trigramR = (luopanRadii[0] + luopanRadii[1]) / 2;
      trigrams.forEach((t) => {
        const rad = (t.deg * Math.PI) / 180;
        const tLat = lat + (Math.cos(rad) * trigramR) / 111320;
        const tLng =
          lng + (Math.sin(rad) * trigramR) / (111320 * Math.cos((lat * Math.PI) / 180));
        const icon = L.divIcon({
          className: "",
          html: `<div style="font:600 16px 'Cormorant Garamond',serif;color:hsl(38 55% 35%);text-shadow:0 1px 2px hsl(0 0% 100% / 0.9);line-height:1;text-align:center;"><div>${t.sym}</div><div style="font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:hsl(142 28% 30%);margin-top:2px;">${t.name}</div></div>`,
          iconSize: [40, 28],
          iconAnchor: [20, 14],
        });
        L.marker([tLat, tLng], { icon, interactive: false }).addTo(map);
      });

      // Cardinal direction labels (N/E/S/W) just inside the outer rim
      const cardinals = [
        { label: "N", deg: 0 },
        { label: "E", deg: 90 },
        { label: "S", deg: 180 },
        { label: "W", deg: 270 },
      ];
      const cardR = luopanRadii[0] - 40;
      cardinals.forEach((c) => {
        const rad = (c.deg * Math.PI) / 180;
        const cLat = lat + (Math.cos(rad) * cardR) / 111320;
        const cLng =
          lng + (Math.sin(rad) * cardR) / (111320 * Math.cos((lat * Math.PI) / 180));
        const icon = L.divIcon({
          className: "",
          html: `<div style="font:700 11px Inter,sans-serif;letter-spacing:0.2em;color:hsl(142 28% 20%);background:hsl(0 0% 100% / 0.85);padding:2px 6px;border-radius:9999px;border:1px solid hsl(38 55% 55% / 0.5);">${c.label}</div>`,
          iconSize: [24, 18],
          iconAnchor: [12, 9],
        });
        L.marker([cLat, cLng], { icon, interactive: false }).addTo(map);
      });
    } else {
      // Simple radius circle (sage)
      L.circle([lat, lng], {
        radius: radiusM,
        color: "hsl(142 28% 38%)",
        weight: 2,
        fillColor: "hsl(142 28% 38%)",
        fillOpacity: 0.08,
      }).addTo(map);
    }
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

    // Amenity markers (blue)
    amenities.forEach((a) => {
      const icon = L.divIcon({
        className: "",
        html: `<div title="${a.name}" style="width:12px;height:12px;border-radius:9999px;background:hsl(210 75% 55%);border:2px solid white;box-shadow:0 2px 6px hsl(210 60% 25% / 0.5);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([a.lat, a.lng], { icon, title: a.name }).addTo(map);
    });

    // Nearest water marker (if within visible-ish range)
    if (waterPoint) {
      const waterIcon = L.divIcon({
        className: "",
        html: `<div style="padding:4px 8px;border-radius:9999px;background:hsl(195 45% 55% / 0.95);color:white;font:500 11px Inter,sans-serif;white-space:nowrap;box-shadow:0 4px 12px hsl(195 45% 30% / 0.35);">${waterPoint.name}</div>`,
        iconSize: [0, 0],
      });
      L.marker([waterPoint.lat, waterPoint.lng], { icon: waterIcon }).addTo(map);
    }
  }, [lat, lng, facingDeg, buildingName, waterPoint, amenities]);

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
