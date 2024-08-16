import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiConfiguration } from "./lib/api";

export const config = {
  matcher: [
    "/.well-known/:path*",
    "/oauth/:path*",
    "/oidc/:path*",
    "/idps/callback/:path*",
  ],
};

export function middleware(request: NextRequest) {
  // TODO: wildcard find out the target api url from the host of the request
  const host = request.nextUrl.host;
  if (!host) {
    throw new Error("No host header found!");
  }
  const targetApi = getApiConfiguration(host);
  const INSTANCE = targetApi.url;
  const SERVICE_USER_ID = targetApi.userId;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-zitadel-login-client", SERVICE_USER_ID);

  // this is a workaround for the next.js server not forwarding the host header
  // requestHeaders.set("x-zitadel-forwarded", `host="${request.nextUrl.host}"`);
  requestHeaders.set("x-zitadel-public-host", `${request.nextUrl.host}`);

  // this is a workaround for the next.js server not forwarding the host header
  requestHeaders.set(
    "x-zitadel-instance-host",
    `${INSTANCE}`.replace("https://", ""),
  );

  const responseHeaders = new Headers();
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Headers", "*");

  request.nextUrl.href = `${INSTANCE}${request.nextUrl.pathname}${request.nextUrl.search}`;
  return NextResponse.rewrite(request.nextUrl, {
    request: {
      headers: requestHeaders,
    },
    headers: responseHeaders,
  });
}
