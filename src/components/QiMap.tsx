/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { RotateCcw, RotateCw, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, ZEN_SILVER_MAP_STYLE } from "@/lib/google";
import type { Amenity } from "@/lib/places";
import { isPeriod9Auspicious } from "@/lib/fengshui";

type Props = {
  lat: number;
  lng: number;
  facingDeg: number | null;
  buildingName: string;
  waterPoint?: { lat: number; lng: number; name: string } | null;
  amenities?: Amenity[];
  variant?: "luopan" | "radius";
  radiusM?: number;
  showLuopanOverlay?: boolean; // for radius variant we still overlay a small luopan
};

const CATEGORY_COLOR: Record<string, string> = {
  transport: "hsl(210 75% 55%)",
  education: "hsl(280 55% 55%)",
  food: "hsl(25 80% 55%)",
  fastfood: "hsl(0 70% 55%)",
  medical: "hsl(340 65% 55%)",
  greenery: "hsl(142 50% 45%)",
};

/** Inner map content (rendered inside APIProvider). */
const MapContent = ({
  lat,
  lng,
  facingDeg,
  buildingName,
  waterPoint,
  amenities = [],
  variant = "luopan",
  radiusM = 500,
  manualRotation,
}: Props & { manualRotation: number }) => {
  const map = useMap();
  const circlesRef = useRef<google.maps.Circle[]>([]);

  // Re-center when target changes
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);

  // Draw the radius circle (and luopan-styled inner ring for the feng shui variant).
  useEffect(() => {
    if (!map) return;
    // Clear previous
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const center = { lat, lng };
    if (variant === "radius") {
      const c = new google.maps.Circle({
        map,
        center,
        radius: radiusM,
        strokeColor: "hsl(142 28% 38%)",
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: "hsl(142 28% 38%)",
        fillOpacity: 0.06,
      });
      circlesRef.current.push(c);
    } else {
      // Luopan rings (drawn as concentric circles)
      const radii = [500, 380, 260, 150];
      radii.forEach((r, i) => {
        const c = new google.maps.Circle({
          map,
          center,
          radius: r,
          strokeColor: i === 0 ? "hsl(38 55% 55%)" : i % 2 === 0 ? "hsl(142 28% 38%)" : "hsl(38 55% 55%)",
          strokeOpacity: i === 0 ? 0.85 : 0.45,
          strokeWeight: i === 0 ? 2 : 1,
          fillOpacity: i === 0 ? 0.05 : 0,
          fillColor: "hsl(38 55% 55%)",
        });
        circlesRef.current.push(c);
      });
    }

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, lat, lng, variant, radiusM]);

  // Effective rotation = auto facing + manual offset (if facing known), else just manual.
  const rotation = (facingDeg ?? 0) + manualRotation;
  const auspicious = isPeriod9Auspicious(facingDeg);

  return (
    <>
      {/* Luopan SVG overlay — always shown, positioned over the building marker */}
      <LuopanOverlay rotation={rotation} auspicious={auspicious} variant={variant} />

      {/* Building marker */}
      <AdvancedMarker position={{ lat, lng }} title={buildingName}>
        <div
          className="rounded-full border-2 border-white shadow-lg"
          style={{
            width: 18,
            height: 18,
            background: "hsl(142 28% 38%)",
            boxShadow: "0 0 0 6px hsl(142 28% 38% / 0.18), 0 4px 14px hsl(142 28% 25% / 0.35)",
          }}
        />
      </AdvancedMarker>

      {/* Amenity markers */}
      {amenities.map((a) => (
        <AdvancedMarker key={a.id} position={{ lat: a.lat, lng: a.lng }} title={a.name}>
          <div
            className="rounded-full border-2 border-white"
            style={{
              width: 11,
              height: 11,
              background: CATEGORY_COLOR[a.category] || "hsl(210 75% 55%)",
              boxShadow: "0 2px 6px hsl(210 60% 25% / 0.4)",
            }}
          />
        </AdvancedMarker>
      ))}

      {/* Water marker */}
      {waterPoint && (
        <AdvancedMarker position={{ lat: waterPoint.lat, lng: waterPoint.lng }}>
          <div
            className="px-2 py-1 rounded-full text-[11px] font-medium text-white whitespace-nowrap"
            style={{
              background: "hsl(195 45% 55% / 0.95)",
              boxShadow: "0 4px 12px hsl(195 45% 30% / 0.35)",
            }}
          >
            {waterPoint.name}
          </div>
        </AdvancedMarker>
      )}
    </>
  );
};

/** SVG Luo Pan compass overlay drawn over map center. */
const LuopanOverlay = ({
  rotation,
  auspicious,
  variant,
}: {
  rotation: number;
  auspicious: boolean;
  variant: "luopan" | "radius";
}) => {
  const size = variant === "luopan" ? 280 : 180;
  const stroke = auspicious ? "hsl(142 50% 45%)" : "hsl(38 55% 50%)";

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: 0.85,
          filter: "drop-shadow(0 4px 14px hsl(142 28% 25% / 0.25))",
        }}
      >
        {/* Outer rim */}
        <circle cx="100" cy="100" r="92" fill="none" stroke={stroke} strokeWidth="1.5" />
        <circle cx="100" cy="100" r="78" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.6" />

        {/* 24 spokes (Luo Pan's 24 mountains) */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const isCardinal = i % 6 === 0;
          const r1 = isCardinal ? 0 : 78;
          const r2 = 92;
          const x1 = 100 + Math.sin(angle) * r1;
          const y1 = 100 - Math.cos(angle) * r1;
          const x2 = 100 + Math.sin(angle) * r2;
          const y2 = 100 - Math.cos(angle) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isCardinal ? "hsl(142 28% 20%)" : stroke}
              strokeWidth={isCardinal ? 1.2 : 0.5}
              opacity={isCardinal ? 0.85 : 0.4}
            />
          );
        })}

        {/* Cardinal labels — counter-rotate so they read upright */}
        {[
          { label: "N", angle: 0 },
          { label: "E", angle: 90 },
          { label: "S", angle: 180 },
          { label: "W", angle: 270 },
        ].map((c) => {
          const rad = (c.angle * Math.PI) / 180;
          const x = 100 + Math.sin(rad) * 60;
          const y = 100 - Math.cos(rad) * 60;
          return (
            <g key={c.label} transform={`translate(${x} ${y}) rotate(${-rotation})`}>
              <circle r="9" fill="white" opacity="0.85" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight="700"
                fill="hsl(142 28% 20%)"
                style={{ letterSpacing: "0.1em" }}
              >
                {c.label}
              </text>
            </g>
          );
        })}

        {/* Facing arrow (always pointing "north" of the rotated compass = building's facing) */}
        <g>
          <line x1="100" y1="100" x2="100" y2="40" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="40" r="4" fill={stroke} stroke="white" strokeWidth="1.5" />
        </g>

        {/* Center dot */}
        <circle cx="100" cy="100" r="3" fill="hsl(142 28% 20%)" />
      </svg>
    </div>
  );
};

const QiMap = (props: Props) => {
  const [manualRotation, setManualRotation] = useState(0);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-[340px] sm:h-[420px] rounded-2xl border border-border/60 bg-muted/40 flex items-center justify-center text-center px-6">
        <div className="max-w-sm">
          <Compass className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <div className="text-sm font-medium">Google Maps API key not set</div>
          <p className="text-xs text-muted-foreground mt-2">
            Paste your key into <code className="text-foreground">src/lib/google.ts</code> and
            restrict it by HTTP referrer in Google Cloud Console.
          </p>
        </div>
      </div>
    );
  }

  const zoom = props.variant === "radius" ? 15 : 16;

  return (
    <div className="relative">
      <div className="w-full h-[340px] sm:h-[460px] rounded-2xl overflow-hidden shadow-soft border border-border">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={[...GOOGLE_MAPS_LIBRARIES]}>
          <Map
            mapId="qiscan-zen"
            defaultCenter={{ lat: props.lat, lng: props.lng }}
            defaultZoom={zoom}
            disableDefaultUI
            gestureHandling="greedy"
            styles={ZEN_SILVER_MAP_STYLE}
          >
            <MapContent {...props} manualRotation={manualRotation} />
          </Map>
        </APIProvider>
      </div>

      {/* Manual rotation controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/85 backdrop-blur rounded-full border border-border/60 shadow-soft px-1 py-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={() => setManualRotation((r) => r - 15)}
          aria-label="Rotate Luopan counter-clockwise"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground px-1 tabular-nums">
          {props.facingDeg != null
            ? `${Math.round(((props.facingDeg ?? 0) + manualRotation + 360) % 360)}°`
            : `${((manualRotation % 360) + 360) % 360}°`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={() => setManualRotation((r) => r + 15)}
          aria-label="Rotate Luopan clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default QiMap;
