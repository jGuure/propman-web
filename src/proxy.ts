import { NextResponse, type NextRequest } from "next/server";
import { serverConfig } from "@/lib/config";
import { classifyHost, TENANT_HEADER } from "@/lib/host";

/**
 * Routes by host so every area keeps clean URLs:
 *   demo.localhost:3000/users   -> app/tenant/(app)/users
 *   admin.localhost:3000/tenants -> app/admin/(app)/tenants
 *   localhost:3000/register     -> app/(site)/register
 * The tenant slug is passed to the tenant layout in a request header.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = classifyHost(request.headers.get("host"), serverConfig().baseDomain);
  const headers = new Headers(request.headers);
  headers.delete(TENANT_HEADER);

  if (host.kind === "tenant") {
    headers.set(TENANT_HEADER, host.slug);
    return NextResponse.rewrite(new URL(`/tenant${pathname === "/" ? "" : pathname}`, request.url), {
      request: { headers },
    });
  }
  if (host.kind === "admin") {
    return NextResponse.rewrite(new URL(`/admin${pathname === "/" ? "" : pathname}`, request.url), {
      request: { headers },
    });
  }
  // the tenant and admin areas are only reachable through their own hosts
  if (/^\/(tenant|admin)(\/|$)/.test(pathname)) {
    return NextResponse.rewrite(new URL("/not-found", request.url), { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
