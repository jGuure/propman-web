/**
 * Decides which part of the app a host serves:
 * - `admin.<base>`            -> platform admin
 * - `<slug>.<base>`           -> that tenant
 * - `<base>`, `www.<base>`... -> the root site (landing page, registration)
 */
/** Request header in which the proxy passes the tenant slug to the tenant layout. */
export const TENANT_HEADER = "x-propman-tenant";

export type HostKind =
  | { kind: "root" }
  | { kind: "admin" }
  | { kind: "tenant"; slug: string };

const SLUG = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;
const NON_TENANT_SUBDOMAINS = new Set(["www", "api", "app"]);

export function classifyHost(host: string | null | undefined, baseDomain: string): HostKind {
  if (!host) {
    return { kind: "root" };
  }
  const hostname = host.toLowerCase().replace(/:\d+$/, "");
  const suffix = `.${baseDomain.toLowerCase()}`;
  if (!hostname.endsWith(suffix)) {
    return { kind: "root" };
  }
  const subdomain = hostname.slice(0, -suffix.length);
  if (subdomain === "admin") {
    return { kind: "admin" };
  }
  if (subdomain.includes(".") || NON_TENANT_SUBDOMAINS.has(subdomain) || !SLUG.test(subdomain)) {
    return { kind: "root" };
  }
  return { kind: "tenant", slug: subdomain };
}
