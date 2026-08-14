import { dataTruthClasses, type DataTruth } from "@/lib/dataTruth";

export function DataTruthBadge({
  truth,
  compact = false,
}: {
  truth: DataTruth;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium ${dataTruthClasses(truth.state)} ${
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"
      }`}
      title={truth.detail}
    >
      {truth.label}
    </span>
  );
}
