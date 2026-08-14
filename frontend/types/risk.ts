export type RiskCheck = {
  name: string;
  status: string;
  severity: string;
};

export type RiskStatus = {
  status: string;
  checks: RiskCheck[];
};

export type DataQualityCheck = {
  name: string;
  status: "OK" | "WARNING" | "FAILED";
  severity: "low" | "medium" | "high";
  message: string;
  table?: string | null;
  source?: string | null;
  latest_timestamp_utc?: string | null;
  expected?: string | null;
  repair_command?: string | null;
  fallback_used?: boolean;
};

export type DataQualityStatus = {
  country: string;
  zone: string;
  status: "OK" | "WARNING" | "FAILED";
  checks: DataQualityCheck[];
};
