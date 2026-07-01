"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { RiskStatus } from "@/types/risk";

export function useRiskStatus() {
  const [data, setData] = useState<RiskStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await apiGet<RiskStatus>("/risk/status");

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  return { data, isLoading, error };
}