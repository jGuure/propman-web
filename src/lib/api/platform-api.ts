import type { ApiClient } from "./client";
import type {
  PageResponse,
  PlatformAdmin,
  PlatformAuthResponse,
  TenantDetails,
  TenantListParams,
  TenantSummary,
} from "./types";

export function platformApi(client: ApiClient) {
  return {
    login: (email: string, password: string) =>
      client.post<PlatformAuthResponse>("/platform/auth/login", { email, password }, { auth: false }),
    logout: (refreshToken: string) =>
      client.post<void>("/platform/auth/logout", { refreshToken }, { auth: false }),
    me: () => client.get<PlatformAdmin>("/platform/auth/me"),
    tenants: (params: TenantListParams) =>
      client.get<PageResponse<TenantSummary>>("/platform/tenants", { ...params, sort: "createdAt,desc" }),
    tenant: (id: string) => client.get<TenantDetails>(`/platform/tenants/${id}`),
    suspend: (id: string, reason: string) =>
      client.post<TenantDetails>(`/platform/tenants/${id}/suspend`, { reason }),
    activate: (id: string) => client.post<TenantDetails>(`/platform/tenants/${id}/activate`),
  };
}

export type PlatformApi = ReturnType<typeof platformApi>;
