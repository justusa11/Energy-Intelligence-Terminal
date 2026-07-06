import { RoadmapModule } from "@/components/RoadmapModule";

export default function DerivativesPage() {
  return (
    <RoadmapModule
      title="Derivatives Analytics"
      description="Forward curves, spark spreads, volatility, and market positioning."
      planned={[
        "Forward and futures curve visualization",
        "Historical and implied volatility surfaces",
        "Clean spark and dark spread analytics",
        "Position and hedge ratio tracking",
      ]}
    />
  );
}
