"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

/** Generic GET hook used by all module pages. Re-fetches when the path changes. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await apiGet<T>(path as string, {
          signal: controller.signal,
        });
        setData(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [path]);

  return { data, isLoading, error };
}
