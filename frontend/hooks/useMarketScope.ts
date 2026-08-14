"use client";

import { useCallback, useEffect, useState } from "react";
import { zones } from "@/lib/constants";

type MarketScope = {
  country: string;
  zone: string;
};

const DEFAULT_SCOPE: MarketScope = { country: "DK", zone: "DK1" };
const STORAGE_KEY = "flextrade.marketScope";
const EVENT_NAME = "flextrade:market-scope";

export function useMarketScope() {
  const [scope, setScopeState] = useState<MarketScope>(DEFAULT_SCOPE);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setScopeState(readStoredScope());
    });

    function handleScope(event: Event) {
      const detail = (event as CustomEvent<MarketScope>).detail;
      if (isValidScope(detail)) {
        setScopeState(detail);
      }
    }

    window.addEventListener(EVENT_NAME, handleScope);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(EVENT_NAME, handleScope);
    };
  }, []);

  const setScope = useCallback((next: MarketScope) => {
    if (!isValidScope(next)) return;
    setScopeState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }, []);

  const setZone = useCallback(
    (zone: string, country?: string) => {
      const selected = zones.find((candidate) => candidate.value === zone);
      if (!selected) return;
      setScope({ zone: selected.value, country: country ?? selected.country });
    },
    [setScope]
  );

  const setCountry = useCallback(
    (country: string) => {
      const selected = zones.find((candidate) => candidate.country === country);
      if (selected) {
        setScope({ country, zone: selected.value });
      }
    },
    [setScope]
  );

  return { ...scope, setCountry, setScope, setZone };
}

function readStoredScope() {
  try {
    if (typeof window === "undefined") return DEFAULT_SCOPE;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SCOPE;
    const parsed = JSON.parse(stored) as MarketScope;
    return isValidScope(parsed) ? parsed : DEFAULT_SCOPE;
  } catch {
    return DEFAULT_SCOPE;
  }
}

function isValidScope(scope: unknown): scope is MarketScope {
  if (!scope || typeof scope !== "object") return false;
  const candidate = scope as MarketScope;
  return zones.some(
    (zone) => zone.value === candidate.zone && zone.country === candidate.country
  );
}
