import { useApi } from "@/hooks/useApi";

export type IngestionJobStatus = {
  status: string;
  latest_run_utc: string | null;
  finished_at_utc?: string | null;
  rows_fetched?: number;
  rows_inserted?: number;
  message: string | null;
  repair_command: string | null;
};

export type IngestionStatus = {
  country: string;
  zone: string;
  providers: Record<string, { configured: boolean; purpose: string }>;
  jobs: Record<string, IngestionJobStatus>;
};

export function useIngestionStatus(country: string, zone: string) {
  return useApi<IngestionStatus>(
    `/health/ingestion-status?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(zone)}`
  );
}
