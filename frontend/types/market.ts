export type MarketOverview = {
  country: string;
  zone: string;
  average_price_eur_mwh: number;
  peak_price_eur_mwh: number;
  cheapest_hour: string;
  market_regime: string;
  regime_confidence: number;
  risk_status: string;
  recommendation: string;
};