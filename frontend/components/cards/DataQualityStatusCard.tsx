import type { DataQualityStatus } from "@/types/risk";

type DisplayStatus = {
  label: string;
  className: string;
  description: string;
};

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
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Data Quality</h2>
        <p className="mt-2 text-sm text-slate-400">
          No quality checks are available for the selected market scope yet.
        </p>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(data);
  const okCount = data.checks.filter((check) => check.status === "OK").length;
  const openCheckCount = data.checks.length - okCount;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data Quality</h2>
          <p className="mt-1 text-sm text-slate-400">
            {data.country} / {data.zone}
          </p>
        </div>

        <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${displayStatus.className}`}>
          {displayStatus.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Checks OK</p>
          <p className="mt-1 text-xl font-semibold text-green-400">{okCount}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Open checks</p>
          <p className="mt-1 text-xl font-semibold text-amber-400">{openCheckCount}</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
        {displayStatus.description}
      </p>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {data.checks.map((check, index) => {
          const checkDisplay = getCheckDisplay(check.status, check.message);

          return (
            <div
              key={`${check.name}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-950 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-200">
                  {check.name}
                </p>
                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${checkDisplay.className}`}>
                  {checkDisplay.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{check.message}</p>
              <div className="mt-3 grid gap-2 text-[11px] text-slate-500">
                {check.table && <QualityMeta label="Table" value={check.table} />}
                {check.latest_timestamp_utc && (
                  <QualityMeta label="Latest" value={formatTimestamp(check.latest_timestamp_utc)} />
                )}
                {check.expected && check.status !== "OK" && (
                  <QualityMeta label="Expected" value={check.expected} />
                )}
                {check.repair_command && check.status !== "OK" && (
                  <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                    <p className="text-amber-300">Repair command</p>
                    <code className="mt-1 block break-words text-slate-300">{check.repair_command}</code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QualityMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-slate-900/70 px-2 py-1.5">
      <span>{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace(".000Z", "Z");
}

function getDisplayStatus(data: DataQualityStatus): DisplayStatus {
  const hasHardFailure = data.checks.some(
    (check) =>
      check.status === "FAILED" &&
      !/no .* found|no .* timestamp|sample/i.test(check.message)
  );

  if (data.status === "OK") {
    return {
      label: "Operational",
      className: "bg-green-500/10 text-green-400",
      description: "Quality checks are passing for the selected market scope.",
    };
  }

  if (hasHardFailure) {
    return {
      label: "Action required",
      className: "bg-red-500/10 text-red-400",
      description: "One or more quality checks found invalid values that need operator attention.",
    };
  }

  return {
    label: "Live data pending",
    className: "bg-amber-500/10 text-amber-400",
    description:
      "Live records are not populated yet, so analytics use deterministic sample curves where available.",
  };
}

function getCheckDisplay(status: string, message: string) {
  if (status === "OK") {
    return { label: "OK", className: "bg-green-500/10 text-green-400" };
  }

  if (/no .* found|no .* timestamp/i.test(message)) {
    return { label: "Pending", className: "bg-amber-500/10 text-amber-400" };
  }

  if (status === "WARNING") {
    return { label: "Watch", className: "bg-amber-500/10 text-amber-400" };
  }

  return { label: "Failed", className: "bg-red-500/10 text-red-400" };
}
