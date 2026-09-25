/**
 * Full page navigation to another origin (a tenant subdomain or the root site). Next.js client navigation only
 * works within one origin, and every subdomain keeps its own session storage.
 */
export function navigateToOrigin(url: string): void {
  window.location.href = url;
}
