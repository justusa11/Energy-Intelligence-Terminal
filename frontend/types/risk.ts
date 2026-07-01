export type RiskCheck = {
  name: string;
  status: string;
  severity: string;
};

export type RiskStatus = {
  status: string;
  checks: RiskCheck[];
};