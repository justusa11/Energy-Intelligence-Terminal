"use client";

import { useApi } from "@/hooks/useApi";
import type { DataQualityStatus } from "@/types/risk";

export function useDataQuality(country = "DK", zone = "DK1") {
  return useApi<DataQualityStatus>(
    `/risk/data-quality?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(zone)}`
  );
}
