import type { DataQualityStatus } from "@/types/risk";

export function DataQualityStatusCard({
  data,
  isLoading,
  error,
}: {
  data: DataQualityStatus | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Data Quality</h2>
        <p className="mt-2 text-sm text-slate-400">Loading quality checks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <h2 className="text-lg font-semibold text-red-400">Data Quality</h2>
        <p className="mt-2 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statusClass =
    data.status === "OK"
      ? "text-green-400"
      : data.status === "WARNING"
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data Quality</h2>
          <p className="mt-1 text-sm text-slate-400">
            {data.country} / {data.zone}
          </p>
        </div>

        <span className={`text-sm font-semibold ${statusClass}`}>
          {data.status}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {data.checks.map((check) => {
          const checkClass =
            check.status === "OK"
              ? "text-green-400"
              : check.status === "WARNING"
              ? "text-amber-400"
              : "text-red-400";

          return (
            <div
              key={check.name}
              className="rounded-lg border border-slate-800 bg-slate-950 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-200">
                  {check.name}
                </p>
                <span className={`text-xs font-semibold ${checkClass}`}>
                  {check.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{check.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}