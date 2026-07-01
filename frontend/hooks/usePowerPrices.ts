"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { DayAheadPrices } from "@/types/prices";

export function usePowerPrices(country = "DK", zone = "DK1") {
  const [data, setData] = useState<DayAheadPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await apiGet<DayAheadPrices>(
          `/prices/day-ahead?country=${country}&zone=${zone}`
        );

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [country, zone]);

  return { data, isLoading, error };
}