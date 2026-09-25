import type { TokenPair } from "@/lib/api/types";

/**
 * Tokens of one realm (tenant users or platform admins) in localStorage.
 * localStorage is per origin, so every tenant subdomain keeps its own session.
 */
export class SessionStore {
  private readonly listeners = new Set<() => void>();

  constructor(private readonly key: string) {}

  get(): TokenPair | null {
    const raw = this.snapshot();
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TokenPair;
    } catch {
      return null;
    }
  }

  /** Raw stored value; stable between calls, suitable for useSyncExternalStore. */
  snapshot(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return window.localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  set(tokens: TokenPair): void {
    const pair: TokenPair = {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    };
    try {
      window.localStorage.setItem(this.key, JSON.stringify(pair));
    } catch {
      // storage unavailable (private mode): the session lives until the page is reloaded
    }
    this.notify();
  }

  clear(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // ignore
    }
    this.notify();
  }

  /** Listens to changes from this tab and from other tabs of the same origin. */
  subscribe = (listener: () => void): (() => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === this.key) {
        listener();
      }
    };
    this.listeners.add(listener);
    window.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const tenantSessionStore = new SessionStore("propman.session");
export const platformSessionStore = new SessionStore("propman.platform.session");
