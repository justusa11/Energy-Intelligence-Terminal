import { zones } from "@/lib/constants";

export type DataTruthState = "live" | "sample" | "stale" | "failed" | "pending";

export type DataTruth = {
  state: DataTruthState;
  label: string;
  detail: string;
};

export function getZoneTruth(country: string, zone: string): DataTruth {
  const option = zones.find((candidate) => candidate.country === country && candidate.value === zone);
  if (!option) {
    return {
      state: "pending",
      label: "Pending",
      detail: "Market scope is being resolved.",
    };
  }

  if (!option.live) {
    return {
      state: "sample",
      label: "Sample zone",
      detail: "This market uses deterministic sample data until live ingestion is connected.",
    };
  }

  return {
    state: "live",
    label: "Live-capable zone",
    detail: "This market is connected to live ingestion when data jobs are healthy.",
  };
}

export function getSourceTruth(source: string | null | undefined): DataTruth {
  if (!source) {
    return {
      state: "pending",
      label: "Pending",
      detail: "Waiting for the data source to respond.",
    };
  }

  const normalized = source.toLowerCase();
  if (normalized.includes("stale")) {
    return {
      state: "stale",
      label: "Live source stale",
      detail: "The live source is older than expected, so the view is using a current fallback curve.",
    };
  }

  if (normalized.includes("sample") || normalized.includes("fallback") || normalized.includes("mock")) {
    return {
      state: "sample",
      label: "Sample data",
      detail: "This view is using deterministic or fallback data.",
    };
  }

  if (normalized.includes("failed") || normalized.includes("error")) {
    return {
      state: "failed",
      label: "Failed",
      detail: "The data source did not load correctly.",
    };
  }

  return {
    state: "live",
    label: "Live data",
    detail: `Source: ${source}`,
  };
}

export function getRequestTruth({
  error,
  isLoading,
  source,
}: {
  error?: string | null;
  isLoading?: boolean;
  source?: string | null;
}): DataTruth {
  if (error) {
    return {
      state: "failed",
      label: "Failed",
      detail: error,
    };
  }
  if (isLoading) {
    return {
      state: "pending",
      label: "Pending",
      detail: "Loading source data.",
    };
  }
  return getSourceTruth(source);
}

export function dataTruthClasses(state: DataTruthState) {
  switch (state) {
    case "live":
      return "border-green-500/30 bg-green-500/10 text-green-300";
    case "sample":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "stale":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "failed":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "pending":
    default:
      return "border-slate-700 bg-slate-800/70 text-slate-300";
  }
}
