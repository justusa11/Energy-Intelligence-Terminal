import { RoadmapModule } from "@/components/RoadmapModule";

export default function GasCarbonPage() {
  return (
    <RoadmapModule
      title="Gas & Carbon"
      description="Track TTF gas, EUA carbon, spark spreads, and carbon-adjusted power costs."
      planned={[
        "TTF gas and EUA carbon price ingestion",
        "Spark spread and clean spark spread calculation",
        "Carbon-adjusted marginal cost of power",
        "Fuel-switching signals for gas vs. coal generation",
      ]}
    />
  );
}
