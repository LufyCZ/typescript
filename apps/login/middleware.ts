import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/.well-known/:path*", "/oauth/:path*", "/oidc/:path*"],
};

const INSTANCE = process.env.ZITADEL_API_URL;
const SERVICE_USER_ID = process.env.ZITADEL_SERVICE_USER_ID as string;

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers({});
  requestHeaders.set("x-zitadel-login-client", SERVICE_USER_ID);

  const host = request.nextUrl.host;
  requestHeaders.set("x-zitadel-forwarded", `host="${host}"`);

  console.log(`host="${host}"`);
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
