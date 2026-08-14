import type { NextConfig } from "next";

const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const publicApiOrigin =
  publicApiBaseUrl?.startsWith("http://") || publicApiBaseUrl?.startsWith("https://")
    ? publicApiBaseUrl.replace(/\/api\/v1\/?$/, "")
    : undefined;
const apiProxyOrigin = (
  process.env.BACKEND_API_ORIGIN ??
  publicApiOrigin ??
  "http://localhost:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/marketcockpit",
        destination: "/dashboard/market-cockpit",
        permanent: false,
      },
      {
        source: "/dashboard/powerprice",
        destination: "/dashboard/power-prices",
        permanent: false,
      },
      {
        source: "/dashboard/power-prices-page",
        destination: "/dashboard/power-prices",
        permanent: false,
      },
      {
        source: "/dashboard/derivative-analytics",
        destination: "/dashboard/derivatives",
        permanent: false,
      },
      {
        source: "/dashboard/trading-simulator",
        destination: "/dashboard/simulator",
        permanent: false,
      },
      {
        source: "/dashboard/gas-and-carbon",
        destination: "/dashboard/gas-carbon",
        permanent: false,
      },
      {
        source: "/dashboard/infrastructure",
        destination: "/dashboard/infrastructure-map",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
