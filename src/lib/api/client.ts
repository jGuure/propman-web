import { config } from "@/lib/config";
import type { SessionStore } from "@/lib/auth/session-store";
import { ApiError, toProblem } from "./errors";
import type { TokenPair } from "./types";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Send the access token (default true when a session exists). */
  auth?: boolean;
}

export interface ApiClientOptions {
  /** Sent as X-Tenant on every request (tenant realm only). */
  tenantSlug?: string;
  sessions: SessionStore;
  /** Endpoint exchanging a refresh token for a new pair, e.g. "/auth/refresh". */
  refreshPath: string;
  /** Called once the session cannot be refreshed any more. */
  onSessionExpired?: () => void;
}

const EXPIRY_MARGIN_MS = 20_000;

/**
 * Small fetch wrapper: JSON in/out, Problem Details errors, bearer token, X-Tenant header, and transparent
 * refresh (single flight) when the access token is about to expire or a request returns 401.
 */
export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private readonly options: ApiClientOptions) {}

  get<T>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T = void>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const useAuth = options.auth !== false && this.options.sessions.get() !== null;
    if (useAuth && this.accessTokenExpiringSoon()) {
      await this.refresh();
    }
    let response = await this.send(path, options, useAuth);
    if (response.status === 401 && useAuth && (await this.refresh())) {
      response = await this.send(path, options, true);
    }
    return this.parse<T>(response);
  }

  /** Exchanges the stored refresh token; returns false (and ends the session) when that is impossible. */
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const session = this.options.sessions.get();
    if (!session) {
      return false;
    }
    try {
      const response = await this.send(this.options.refreshPath, {
        method: "POST",
        body: { refreshToken: session.refreshToken },
      }, false);
      if (!response.ok) {
        this.expire();
        return false;
      }
      this.options.sessions.set((await response.json()) as TokenPair);
      return true;
    } catch {
      return false;
    }
  }

  private expire(): void {
    this.options.sessions.clear();
    this.options.onSessionExpired?.();
  }

  private accessTokenExpiringSoon(): boolean {
    const session = this.options.sessions.get();
    return !!session && Date.parse(session.accessTokenExpiresAt) - Date.now() < EXPIRY_MARGIN_MS;
  }

  private async send(path: string, options: RequestOptions, withAuth: boolean): Promise<Response> {
    const headers = new Headers({ Accept: "application/json" });
    if (this.options.tenantSlug) {
      headers.set("X-Tenant", this.options.tenantSlug);
    }
    const session = this.options.sessions.get();
    if (withAuth && session) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }
    try {
      return await fetch(buildUrl(path, options.query), { method: options.method ?? "GET", headers, body });
    } catch {
      throw ApiError.network();
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const body: unknown = text ? safeJson(text) : undefined;
    if (!response.ok) {
      throw new ApiError(toProblem(response.status, body));
    }
    return body as T;
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(config.apiUrl + path);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
