// Types for the analytics modules (forecast, screener, flexibility,
// simulator, advisor, reports, weather, countries). Mirrors backend schemas.

export type ForecastPoint = {
  target_time_utc: string;
  predicted_price_eur_mwh: number;
};

export type MarketRegime = {
  name: string;
  confidence: number;
  drivers: string[];
};

export type Forecast = {
  country: string;
  zone: string;
  model: string;
  data_source: string;
  confidence: number;
  drivers: string[];
  feature_summary: Record<string, string | number>;
  generated_at_utc: string;
  metrics: { mae: number; rmse: number; sample_hours: number };
  regime: MarketRegime;
  points: ForecastPoint[];
};

export type ScreenerHour = { hour: string; price_eur_mwh: number };

export type ScreenerOpportunity = {
  kind: string;
  title: string;
  detail: string;
  severity: "info" | "opportunity" | "warning";
};

export type Screener = {
  country: string;
  zone: string;
  data_source: string;
  cheapest_hours: ScreenerHour[];
  most_expensive_hours: ScreenerHour[];
  average_price_eur_mwh: number;
  price_spread_eur_mwh: number;
  spike_risk: "low" | "medium" | "high";
  negative_price_risk: "low" | "medium" | "high";
  opportunities: ScreenerOpportunity[];
};

export type ScheduleSlot = {
  hour: string;
  price_eur_mwh: number;
  battery_action: "charge" | "discharge" | "idle";
  ev_charging: boolean;
  shiftable_load: boolean;
};

export type FlexibilityPlan = {
  country: string;
  zone: string;
  data_source: string;
  battery_capacity_kwh: number;
  battery_power_kw: number;
  ev_charge_kwh: number;
  shiftable_load_kwh: number;
  estimated_savings_eur: number;
  baseline_cost_eur: number;
  optimized_cost_eur: number;
  schedule: ScheduleSlot[];
  summary: string;
};

export type SimulationDay = { date: string; profit_eur: number; cycles: number };

export type Simulation = {
  country: string;
  zone: string;
  data_source: string;
  strategy: string;
  days_simulated: number;
  battery_capacity_kwh: number;
  battery_power_kw: number;
  round_trip_efficiency: number;
  total_profit_eur: number;
  average_daily_profit_eur: number;
  best_day: SimulationDay | null;
  worst_day: SimulationDay | null;
  daily_results: SimulationDay[];
  generated_at_utc: string;
};

export type AdvisorAnswer = {
  question: string;
  answer: string;
  sources: string[];
  suggested_questions: string[];
};

export type ReportSection = { title: string; body: string };

export type Report = {
  report_type: string;
  country: string;
  zone: string;
  generated_at_utc: string;
  title: string;
  markdown: string;
  sections: ReportSection[];
};

export type WeatherPoint = {
  target_time_utc: string;
  temperature_2m_c: number | null;
  wind_speed_10m_ms: number | null;
  wind_speed_100m_ms: number | null;
  shortwave_radiation_wm2: number | null;
  precipitation_mm: number | null;
};

export type WeatherForecast = {
  country: string;
  zone: string;
  source: string;
  forecasts: WeatherPoint[];
};

export type ZoneInfo = {
  code: string;
  name: string;
  data_mode: "live" | "sample";
  currency: string;
};

export type CountryInfo = {
  code: string;
  name: string;
  timezone: string;
  zones: ZoneInfo[];
};

export type Countries = { countries: CountryInfo[] };
