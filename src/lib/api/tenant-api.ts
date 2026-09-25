import type { ApiClient } from "./client";
import type {
  AuthResponse,
  InviteInfo,
  Me,
  Organization,
  PageResponse,
  TenantBranding,
  UpdateOrganizationRequest,
  User,
  UserListParams,
  UserRole,
  UserStatus,
} from "./types";

/** Endpoints of the current tenant (the client adds X-Tenant and the access token). */
export function tenantApi(client: ApiClient) {
  return {
    branding: () => client.get<TenantBranding>("/public/tenant-info"),

    login: (email: string, password: string) =>
      client.post<AuthResponse>("/auth/login", { email, password }, { auth: false }),
    refreshWith: (refreshToken: string) =>
      client.post<AuthResponse>("/auth/refresh", { refreshToken }, { auth: false }),
    logout: (refreshToken: string) => client.post<void>("/auth/logout", { refreshToken }, { auth: false }),
    me: () => client.get<Me>("/auth/me"),
    forgotPassword: (email: string) => client.post<void>("/auth/forgot-password", { email }, { auth: false }),
    resetPassword: (token: string, newPassword: string) =>
      client.post<void>("/auth/reset-password", { token, newPassword }, { auth: false }),
    inviteInfo: (token: string) =>
      client.request<InviteInfo>(`/auth/invite/${encodeURIComponent(token)}`, { auth: false }),
    acceptInvite: (body: { token: string; password: string; fullName?: string; phone?: string }) =>
      client.post<AuthResponse>("/auth/accept-invite", body, { auth: false }),

    organization: () => client.get<Organization>("/organization"),
    updateOrganization: (body: UpdateOrganizationRequest) => client.put<Organization>("/organization", body),
    uploadLogo: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return client.post<Organization>("/organization/logo", form);
    },
    deleteLogo: () => client.delete("/organization/logo"),

    users: (params: UserListParams) => client.get<PageResponse<User>>("/users", { ...params }),
    user: (id: string) => client.get<User>(`/users/${id}`),
    inviteUser: (body: { fullName: string; email: string; phone?: string; role: UserRole }) =>
      client.post<User>("/users/invite", body),
    resendInvite: (id: string) => client.post<void>(`/users/${id}/resend-invite`),
    updateUser: (id: string, body: { fullName: string; phone?: string | null; role: UserRole }) =>
      client.put<User>(`/users/${id}`, body),
    updateUserStatus: (id: string, status: Extract<UserStatus, "ACTIVE" | "DISABLED">) =>
      client.patch<User>(`/users/${id}/status`, { status }),
    updateProfile: (body: { fullName: string; phone?: string | null }) => client.put<User>("/users/me", body),
    changePassword: (currentPassword: string, newPassword: string) =>
      client.put<void>("/users/me/password", { currentPassword, newPassword }),
  };
}

export type TenantApi = ReturnType<typeof tenantApi>;
