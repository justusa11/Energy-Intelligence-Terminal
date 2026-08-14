"use client";

import { useApi } from "@/hooks/useApi";
import type { RiskStatus } from "@/types/risk";

export function useRiskStatus(country = "DK", zone = "DK1") {
  return useApi<RiskStatus>(
    `/risk/status?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(zone)}`
  );
}
