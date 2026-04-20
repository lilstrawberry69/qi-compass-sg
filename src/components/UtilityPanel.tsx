import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  GraduationCap,
  UtensilsCrossed,
  Stethoscope,
  Trees,
  TrainFront,
  Beef,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Amenity, AmenityCategory } from "@/lib/onemap";
import type { UtilityScore } from "@/lib/utility";

const CATEGORY_META: Record<
  AmenityCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  education: { label: "Education", icon: GraduationCap },
  food: { label: "Hawker Centres", icon: UtensilsCrossed },
  medical: { label: "Medical", icon: Stethoscope },
  greenery: { label: "Greenery", icon: Trees },
  transport: { label: "Transport", icon: TrainFront },
  fastfood: { label: "Fast Food", icon: Beef },
};

type Props = {
  score: UtilityScore;
  amenities: Amenity[];
};

const UtilityPanel = ({ score, amenities }: Props) => {
  const grouped = (Object.keys(CATEGORY_META) as AmenityCategory[]).map((cat) => ({
    cat,
    items: amenities
      .filter((a) => a.category === cat)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 6),
  }));

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Score + radar */}
      <Card className="lg:col-span-2 p-6 shadow-zen border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/40 to-transparent" />
        <div className="relative">
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Urban Utility
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-6xl leading-none">{score.score}</span>
            <span className="text-muted-foreground text-sm">/ 100</span>
          </div>
          <Progress value={score.score} className="mt-3 h-2 bg-secondary [&>div]:bg-gradient-sage" />

          <div className="mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={score.radar} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar
                  name="Utility"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {score.yinConflict.present && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/15 p-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-accent-foreground">
                  High Accessibility
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {score.yinConflict.reason}. Counted as convenience here; flagged as
                  Heavy Yin in Feng Shui tab.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Amenity list */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-5 shadow-soft border-border/60 bg-card/60 backdrop-blur-md">
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Amenities within 1 km
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            {grouped.map(({ cat, items }) => {
              const Meta = CATEGORY_META[cat];
              const Icon = Meta.icon;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-sage text-primary-foreground">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-medium tracking-wide">
                      {Meta.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {items.length}
                    </Badge>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-9">None within 1km</p>
                  ) : (
                    <ul className="space-y-1 pl-9">
                      {items.map((a) => (
                        <li
                          key={a.id}
                          className="flex justify-between gap-3 text-xs"
                        >
                          <span className="truncate text-foreground/85">{a.name}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0">
                            {Math.round(a.distanceM)}m
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 shadow-soft border-border/60 bg-card/60 backdrop-blur-md">
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Scoring Notes
          </div>
          <ul className="space-y-2 text-sm">
            {score.notes.length === 0 && (
              <li className="text-muted-foreground text-xs">
                No notable amenities scored — try a more central postal code.
              </li>
            )}
            {score.notes.map((n, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                <span className="text-foreground/80">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default UtilityPanel;
