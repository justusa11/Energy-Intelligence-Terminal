import { useApi } from "@/hooks/useApi";

export type SparkSpreadPoint = {
  label: string;
  gas_eur_mwh: number;
  carbon_eur_t: number;
  power_eur_mwh: number;
  clean_cost_eur_mwh: number;
  clean_spark_eur_mwh: number;
};

export type SparkSpreadResponse = {
  country: string;
  zone: string;
  scenario: string;
  data_source: string;
  efficiency: number;
  emissions_t_mwh: number;
  points: SparkSpreadPoint[];
};

export function useSparkSpread(
  country: string,
  zone: string,
  efficiency: number,
  emissions: number,
  scenario = "base"
) {
  return useApi<SparkSpreadResponse>(
    `/gas-carbon/spark-spread?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(
      zone
    )}&efficiency=${efficiency}&emissions_t_mwh=${emissions}&scenario=${encodeURIComponent(scenario)}`
  );
}
