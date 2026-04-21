import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Compass, Loader2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import QiMap from "@/components/QiMap";
import Navbar from "@/components/Navbar";
import UtilityPanel from "@/components/UtilityPanel";
import { lookupPostal, nearestRoadBearing } from "@/lib/api";
import { nearestWaterbody } from "@/lib/fengshui";
import { fetchAllAmenities, type Amenity } from "@/lib/onemap";
import { computeUtility, type UtilityScore } from "@/lib/utility";
import preloadData from "@/data/preload-018956.json";

const postalSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: "Please enter a valid 6-digit Singapore postal code." });

type UtilityResult = {
  building: string;
  address: string;
  lat: number;
  lng: number;
  facingDeg: number | null;
  amenities: Amenity[];
  score: UtilityScore;
  waterDistanceM: number;
  waterPoint: { lat: number; lng: number; name: string } | null;
};

const DEFAULT_POSTAL = "018956";

const PRELOAD_RESULT: UtilityResult = {
  building: preloadData.place.building,
  address: preloadData.place.address,
  lat: preloadData.place.lat,
  lng: preloadData.place.lng,
  facingDeg: preloadData.facingDeg,
  amenities: preloadData.amenities as Amenity[],
  score: preloadData.utilityScore as UtilityScore,
  waterDistanceM: preloadData.water.distance,
  waterPoint:
    preloadData.water.distance <= 1500
      ? {
          lat: preloadData.water.lat,
          lng: preloadData.water.lng,
          name: preloadData.water.name,
        }
      : null,
};

const Utilities = () => {
  const [postal, setPostal] = useState(DEFAULT_POSTAL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UtilityResult | null>(PRELOAD_RESULT);

  const runScan = useCallback(async (code: string) => {
    const parsed = postalSchema.safeParse(code);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    // Use cached preload for the default postal — instant, no network.
    if (parsed.data === DEFAULT_POSTAL) {
      setResult(PRELOAD_RESULT);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const place = await lookupPostal(parsed.data);
      const point = { lat: place.lat, lng: place.lng };
      const water = nearestWaterbody(point);
      const [{ deg }, amenities] = await Promise.all([
        nearestRoadBearing(point).catch(() => ({ deg: null, roadName: null })),
        fetchAllAmenities(point, 1000),
      ]);
      const score = computeUtility({ amenities, waterDistanceM: water.distance });
      setResult({
        building: place.building,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        facingDeg: deg,
        amenities,
        score,
        waterDistanceM: water.distance,
        waterPoint:
          water.distance <= 1500
            ? { lat: water.water.lat, lng: water.water.lng, name: water.water.name }
            : null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const onScan = (e: React.FormEvent) => {
    e.preventDefault();
    runScan(postal);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-zen"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Feng Shui
        </Link>
        <div className="mt-6 flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-muted-foreground">
          <span className="w-8 h-px bg-foreground/30" />
          Singapore · 1 km radius
        </div>
        <h1 className="font-display text-5xl sm:text-6xl mt-4 leading-tight">
          Urban <em className="text-primary not-italic">Utility</em>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Convenience score from MRT, schools, hawker centres, parks, and clinics within 1 km —
          cross-referenced with Water Qi for a balanced reading.
        </p>
      </header>

      <section className="max-w-5xl mx-auto px-6">
        <Card className="p-5 sm:p-6 shadow-zen border-border/60 bg-card/80 backdrop-blur">
          <form onSubmit={onScan} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 018956"
                value={postal}
                onChange={(e) => setPostal(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-14 pl-11 text-lg tracking-widest font-medium bg-background/70 border-border/70 focus-visible:ring-primary"
                aria-label="Singapore postal code"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-14 px-7 bg-gradient-sage text-primary-foreground hover:opacity-95 shadow-glow transition-zen"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {loading ? "Scanning amenities…" : "Scan Utility"}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="opacity-70">Try:</span>
            {["018956", "238801", "098585", "569933"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPostal(p)}
                className="px-2 py-1 rounded-full border border-border/60 hover:border-primary/50 hover:text-foreground transition-zen"
              >
                {p}
              </button>
            ))}
          </div>
        </Card>
      </section>

      {result && (
        <section className="max-w-5xl mx-auto px-6 mt-8 pb-20 animate-fade-up space-y-6">
          <Card className="p-5 shadow-soft border-border/60 bg-card/80 backdrop-blur">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {result.building}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{result.address}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Compass className="w-3.5 h-3.5" />
                {result.facingDeg != null
                  ? `Facing ${Math.round(result.facingDeg)}°`
                  : "No road bearing"}
              </div>
            </div>
          </Card>

          <QiMap
            lat={result.lat}
            lng={result.lng}
            facingDeg={result.facingDeg}
            buildingName={result.building}
            waterPoint={result.waterPoint}
            amenities={result.amenities}
            variant="radius"
            radiusM={1000}
          />

          <UtilityPanel score={result.score} amenities={result.amenities} />
        </section>
      )}

      <footer className="max-w-5xl mx-auto px-6 pb-10 text-xs text-muted-foreground/80">
        Data: OneMap Singapore · OpenStreetMap. Fast food points are illustrative.
      </footer>
    </main>
  );
};

export default Utilities;
