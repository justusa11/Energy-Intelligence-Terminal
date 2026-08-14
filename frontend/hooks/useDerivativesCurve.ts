import { useApi } from "@/hooks/useApi";

export type DerivativesContract = {
  tenor: string;
  forward_eur_mwh: number;
  previous_eur_mwh: number;
  mark_move_eur_mwh: number;
  volatility: number;
  open_interest_mw: number;
};

export type DerivativesCurveResponse = {
  country: string;
  zone: string;
  scenario: string;
  data_source: string;
  contracts: DerivativesContract[];
};

export function useDerivativesCurve(country: string, zone: string, scenario = "base") {
  return useApi<DerivativesCurveResponse>(
    `/derivatives/curve?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(
      zone
    )}&scenario=${encodeURIComponent(scenario)}`
  );
}
