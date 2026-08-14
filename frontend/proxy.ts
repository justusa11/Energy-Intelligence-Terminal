import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_ORIGIN = "http://localhost:8000";

export function proxy(request: NextRequest) {
  const backendOrigin = (process.env.BACKEND_API_ORIGIN ?? DEFAULT_BACKEND_ORIGIN).replace(/\/$/, "");
  const targetUrl = new URL(`${backendOrigin}${request.nextUrl.pathname}${request.nextUrl.search}`);
  const requestHeaders = new Headers(request.headers);
  const backendToken = process.env.BACKEND_API_TOKEN;

  if (backendToken && !requestHeaders.has("authorization")) {
    requestHeaders.set("authorization", `Bearer ${backendToken}`);
  }

  return NextResponse.rewrite(targetUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: "/api/v1/:path*",
};
