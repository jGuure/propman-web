/** Public runtime configuration (inlined at build time from NEXT_PUBLIC_* variables). */
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
  baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "localhost",
  rootUrl: process.env.NEXT_PUBLIC_ROOT_URL ?? "http://localhost:3000",
  tenantUrlTemplate: process.env.NEXT_PUBLIC_TENANT_URL_TEMPLATE ?? "http://{slug}.localhost:3000",
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.localhost:3000",
};

export function tenantUrl(slug: string): string {
  return config.tenantUrlTemplate.replace("{slug}", slug);
}

/** Host shown next to the slug input, e.g. ".localhost:3000" or ".propman.so". */
export function tenantHostSuffix(): string {
  return new URL(tenantUrl("x")).host.slice(1);
}
