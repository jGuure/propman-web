/**
 * Public runtime configuration. Read from the server's environment at runtime (not inlined at build time), so the
 * same build works on any domain: change the env and restart. The root layout hands the values to the browser in
 * `window.__PROPMAN_CONFIG__`.
 */
export interface PublicConfig {
  apiUrl: string;
  baseDomain: string;
  rootUrl: string;
  tenantUrlTemplate: string;
  adminUrl: string;
}

declare global {
  interface Window {
    __PROPMAN_CONFIG__?: PublicConfig;
  }
}

/** The values from the server's environment; local development defaults when unset. */
export function serverConfig(): PublicConfig {
  return {
    apiUrl: process.env.API_URL ?? "http://localhost:8080/api/v1",
    baseDomain: process.env.BASE_DOMAIN ?? "localhost",
    rootUrl: process.env.ROOT_URL ?? "http://localhost:3000",
    tenantUrlTemplate: process.env.TENANT_URL_TEMPLATE ?? "http://{slug}.localhost:3000",
    adminUrl: process.env.ADMIN_URL ?? "http://admin.localhost:3000",
  };
}

function current(): PublicConfig {
  if (typeof window === "undefined") {
    return serverConfig();
  }
  return window.__PROPMAN_CONFIG__ ?? serverConfig();
}

export const config: PublicConfig = {
  get apiUrl() { return current().apiUrl; },
  get baseDomain() { return current().baseDomain; },
  get rootUrl() { return current().rootUrl; },
  get tenantUrlTemplate() { return current().tenantUrlTemplate; },
  get adminUrl() { return current().adminUrl; },
};

/** Inline script for the root layout; `<` is escaped so a value can never close the script tag. */
export function configScript(): string {
  return `window.__PROPMAN_CONFIG__=${JSON.stringify(serverConfig()).replace(/</g, "\\u003c")};`;
}

export function tenantUrl(slug: string): string {
  return config.tenantUrlTemplate.replace("{slug}", slug);
}

/** Host shown after the slug input without the leading dot, e.g. "localhost:3000" or "propman.so". */
export function tenantHostSuffix(): string {
  return new URL(tenantUrl("x")).host.slice("x.".length);
}
