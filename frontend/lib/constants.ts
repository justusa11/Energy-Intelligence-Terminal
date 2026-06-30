import {
  BarChart3,
  BatteryCharging,
  Bell,
  Bot,
  CloudSun,
  FileText,
  Flame,
  Gauge,
  Globe2,
  LayoutDashboard,
  LineChart,
  Map,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const dashboardNavItems = [
  {
    title: "Market Cockpit",
    href: "/dashboard/market-cockpit",
    icon: LayoutDashboard,
  },
  {
    title: "Power Prices",
    href: "/dashboard/power-prices",
    icon: Zap,
  },
  {
    title: "Gas & Carbon",
    href: "/dashboard/gas-carbon",
    icon: Flame,
  },
  {
    title: "Weather Intelligence",
    href: "/dashboard/weather",
    icon: CloudSun,
  },
  {
    title: "Infrastructure Map",
    href: "/dashboard/infrastructure-map",
    icon: Map,
  },
  {
    title: "Screener",
    href: "/dashboard/screener",
    icon: Gauge,
  },
  {
    title: "Derivatives",
    href: "/dashboard/derivatives",
    icon: LineChart,
  },
  {
    title: "Flexibility Optimizer",
    href: "/dashboard/flexibility",
    icon: BatteryCharging,
  },
  {
    title: "Trading Simulator",
    href: "/dashboard/simulator",
    icon: BarChart3,
  },
  {
    title: "Risk Monitor",
    href: "/dashboard/risk",
    icon: ShieldCheck,
  },
  {
    title: "AI Advisor",
    href: "/dashboard/advisor",
    icon: Bot,
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
  },
];

export const secondaryNavItems = [
  {
    title: "Alerts",
    href: "/dashboard/risk",
    icon: Bell,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const countries = [
  { label: "Denmark", value: "DK" },
  { label: "Germany", value: "DE" },
  { label: "Japan", value: "JP" },
  { label: "United States", value: "US" },
];

export const zones = [
  { label: "DK1", value: "DK1" },
  { label: "DK2", value: "DK2" },
  { label: "Germany", value: "DE-LU" },
  { label: "Tokyo", value: "JP-TOKYO" },
  { label: "ERCOT Houston", value: "US-ERCOT-HOUSTON" },
];