import { useState } from "react";
import { z } from "zod";
import { Compass, Droplets, Loader2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QiMap from "@/components/QiMap";
import QiScoreRing from "@/components/QiScoreRing";
import { lookupPostal, nearestRoadBearing } from "@/lib/api";
import {
  computeQiScore,
  nearestWaterbody,
  compass16,
  type ScoreResult,
} from "@/lib/fengshui";
import { toast } from "sonner";

const postalSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: "Please enter a valid 6-digit Singapore postal code." });

type ScanResult = {
  building: string;
  address: string;
  lat: number;
  lng: number;
  facingDeg: number | null;
  roadName: string | null;
  water: { name: string; distance: number; lat: number; lng: number; kind: string };
  score: ScoreResult;
};

const Index = () => {
  const [postal, setPostal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const onScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = postalSchema.safeParse(postal);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const place = await lookupPostal(parsed.data);
      const point = { lat: place.lat, lng: place.lng };
      const [{ deg, roadName }, water] = await Promise.all([
        nearestRoadBearing(point).catch(() => ({ deg: null, roadName: null })),
        Promise.resolve(nearestWaterbody(point)),
      ]);
      const score = computeQiScore({
        waterDistanceM: water.distance,
        facingDeg: deg,
        hasRoad: deg != null,
      });
      setResult({
        building: place.building,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        facingDeg: deg,
        roadName,
        water: {
          name: water.water.name,
          distance: water.distance,
          lat: water.water.lat,
          lng: water.water.lng,
          kind: water.water.kind,
        },
        score,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-muted-foreground">
          <span className="w-8 h-px bg-foreground/30" />
          Singapore · Period 9
        </div>
        <h1 className="font-display text-5xl sm:text-6xl mt-4 leading-tight">
          Feng Shui <em className="text-primary not-italic">Scanner</em>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Enter a 6-digit postal code to receive a House Qi Rating, calibrated for
          water proximity and the Period 9 facing direction.
        </p>
      </header>

      {/* Search */}
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
              {loading ? "Reading the Qi…" : "Scan Qi"}
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

      {/* Result */}
      {result && (
        <section className="max-w-5xl mx-auto px-6 mt-8 pb-20 animate-fade-up">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Score panel */}
            <Card className="lg:col-span-2 p-6 sm:p-8 shadow-zen border-border/60 bg-card/80 backdrop-blur flex flex-col items-center text-center">
              <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                {result.building}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-[28ch]">
                {result.address}
              </p>

              <div className="my-6 animate-breath">
                <QiScoreRing score={result.score.score} />
              </div>

              <Badge
                variant="secondary"
                className={
                  result.score.facingClass === "wealth"
                    ? "bg-accent/30 text-accent-foreground border-accent/40"
                    : result.score.facingClass === "support"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : ""
                }
              >
                {result.score.facingLabel}
              </Badge>

              <p className="mt-4 font-display text-2xl leading-snug max-w-[24ch]">
                {result.score.summary}
              </p>
            </Card>

            {/* Map + breakdown */}
            <div className="lg:col-span-3 space-y-6">
              <QiMap
                lat={result.lat}
                lng={result.lng}
                facingDeg={result.facingDeg}
                buildingName={result.building}
                waterPoint={
                  result.water.distance <= 1500
                    ? { lat: result.water.lat, lng: result.water.lng, name: result.water.name }
                    : null
                }
              />

              <div className="grid sm:grid-cols-3 gap-4">
                <MetricCard
                  icon={<Droplets className="w-4 h-4" />}
                  label="Water element"
                  value={`${Math.round(result.water.distance)} m`}
                  sub={result.water.name}
                  accent="water"
                />
                <MetricCard
                  icon={<Compass className="w-4 h-4" />}
                  label="Facing"
                  value={
                    result.facingDeg != null
                      ? `${compass16(result.facingDeg)} · ${Math.round(result.facingDeg)}°`
                      : "—"
                  }
                  sub={result.roadName ? `Toward ${result.roadName}` : "Nearest road"}
                  accent="sage"
                />
                <MetricCard
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Score breakdown"
                  value={`+${result.score.waterPoints} water · +${result.score.facingPoints} facing`}
                  sub={`Base ${result.score.basePoints}`}
                  accent="accent"
                />
              </div>

              <Card className="p-5 shadow-soft border-border/60 bg-card/70">
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
                  Reading
                </div>
                <ul className="space-y-2 text-sm">
                  {result.score.notes.map((n, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                      <span className="text-foreground/80">{n}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>
      )}

      {!result && (
        <section className="max-w-5xl mx-auto px-6 mt-10 pb-20">
          <div className="grid sm:grid-cols-3 gap-4">
            <Pillar
              kicker="01"
              title="Water Proximity"
              body="Distance to Singapore's reservoirs, rivers, and coastline. Within 500m yields the full +20."
            />
            <Pillar
              kicker="02"
              title="Period 9 Facing"
              body="Bearing toward the nearest major road. South (165°–195°) is Wealth Auspicious."
            />
            <Pillar
              kicker="03"
              title="Qi Composite"
              body="Blended into a 0–100 score with a short, calm reading of your home's energetic posture."
            />
          </div>
        </section>
      )}

      <footer className="max-w-5xl mx-auto px-6 pb-10 text-xs text-muted-foreground/80">
        Data: OneMap Singapore · OpenStreetMap. For reflection, not divination.
      </footer>
    </main>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: "water" | "sage" | "accent";
}) => {
  const accentClass =
    accent === "water"
      ? "bg-gradient-water text-white"
      : accent === "sage"
      ? "bg-gradient-sage text-primary-foreground"
      : "bg-accent/80 text-accent-foreground";
  return (
    <Card className="p-4 shadow-soft border-border/60 bg-card/80">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center ${accentClass}`}>
          {icon}
        </span>
        <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3 font-display text-2xl leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>
    </Card>
  );
};

const Pillar = ({ kicker, title, body }: { kicker: string; title: string; body: string }) => (
  <Card className="p-5 shadow-soft border-border/60 bg-card/70">
    <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">{kicker}</div>
    <div className="font-display text-2xl mt-2">{title}</div>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
  </Card>
);

export default Index;
