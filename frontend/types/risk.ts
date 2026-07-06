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
};

export type DataQualityStatus = {
  country: string;
  zone: string;
  status: "OK" | "WARNING" | "FAILED";
  checks: DataQualityCheck[];
};