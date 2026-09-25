import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionStore } from "@/lib/auth/session-store";
import { ApiClient } from "./client";
import { ApiError } from "./errors";
import type { TokenPair } from "./types";

function tokens(access: string, refresh: string, expiresInMs = 600_000): TokenPair {
  return {
    accessToken: access,
    accessTokenExpiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    refreshToken: refresh,
    refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ApiClient", () => {
  const storage = new Map<string, string>();
  let sessions: SessionStore;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
        removeItem: (k: string) => storage.delete(k),
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    sessions = new SessionStore("test.session");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("sends the tenant header and bearer token", async () => {
    sessions.set(tokens("A1", "R1"));
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    const client = new ApiClient({ tenantSlug: "demo", sessions, refreshPath: "/auth/refresh" });

    await client.get("/users", { page: 0, search: "" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/users?page=0");
    expect(init.headers.get("X-Tenant")).toBe("demo");
    expect(init.headers.get("Authorization")).toBe("Bearer A1");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    sessions.set(tokens("A1", "R1"));
    fetchMock
      .mockResolvedValueOnce(json(401, { status: 401, code: "UNAUTHORIZED" }))
      .mockResolvedValueOnce(json(200, tokens("A2", "R2")))
      .mockResolvedValueOnce(json(200, { id: 1 }));
    const client = new ApiClient({ sessions, refreshPath: "/auth/refresh" });

    await expect(client.get("/auth/me")).resolves.toEqual({ id: 1 });

    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ refreshToken: "R1" });
    expect(fetchMock.mock.calls[2][1].headers.get("Authorization")).toBe("Bearer A2");
    expect(sessions.get()?.refreshToken).toBe("R2");
  });

  it("refreshes before the request when the access token is about to expire", async () => {
    sessions.set(tokens("A1", "R1", 5_000));
    fetchMock.mockResolvedValueOnce(json(200, tokens("A2", "R2"))).mockResolvedValueOnce(json(200, {}));
    const client = new ApiClient({ sessions, refreshPath: "/auth/refresh" });

    await client.get("/auth/me");

    expect(fetchMock.mock.calls[0][0]).toContain("/auth/refresh");
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer A2");
  });

  it("ends the session when the refresh token is rejected", async () => {
    sessions.set(tokens("A1", "R1"));
    fetchMock
      .mockResolvedValueOnce(json(401, { status: 401 }))
      .mockResolvedValueOnce(json(401, { status: 401, code: "REFRESH_TOKEN_REUSED" }));
    const expired = vi.fn();
    const client = new ApiClient({ sessions, refreshPath: "/auth/refresh", onSessionExpired: expired });

    await expect(client.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(sessions.get()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });

  it("shares one refresh between concurrent requests", async () => {
    sessions.set(tokens("A1", "R1", 1_000));
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/auth/refresh") ? json(200, tokens("A2", "R2")) : json(200, {}));
    const client = new ApiClient({ sessions, refreshPath: "/auth/refresh" });

    await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);

    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("turns Problem Details into ApiError with field errors", async () => {
    fetchMock.mockResolvedValueOnce(json(400, {
      status: 400, code: "VALIDATION_ERROR", detail: "Request validation failed",
      errors: [{ field: "slug", message: "is already taken" }],
    }));
    const client = new ApiClient({ sessions, refreshPath: "/auth/refresh" });

    const error = await client.post("/x", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("VALIDATION_ERROR");
    expect((error as ApiError).fieldErrors).toEqual([{ field: "slug", message: "is already taken" }]);
  });

  it("reports network failures", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const client = new ApiClient({ sessions, refreshPath: "/auth/refresh" });
    await expect(client.get("/x")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
