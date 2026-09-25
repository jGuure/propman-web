export type UserRole = "OWNER" | "MANAGER" | "ACCOUNTANT" | "STAFF";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type TenantStatus = "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "FAILED";

export type Permission =
  | "organization:read"
  | "organization:update"
  | "users:read"
  | "users:manage"
  | "profile:update";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

/** RFC 7807 Problem Details as returned by the API. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  instance?: string;
  errors?: FieldError[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TenantRef {
  id: string;
  name: string;
  slug: string;
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResponse extends TokenPair {
  tokenType: "Bearer";
  tenant: TenantRef;
  user: User;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  updatedAt: string;
}

export interface Me {
  user: User;
  organization: Organization;
  permissions: Permission[];
}

export interface TenantBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface InviteInfo {
  email: string;
  fullName: string;
  organizationName: string;
}

export interface SlugAvailability {
  slug: string;
  available: boolean;
  reason: "INVALID_FORMAT" | "RESERVED" | "TAKEN" | null;
}

export interface RegisterRequest {
  companyName: string;
  slug: string;
  companyEmail: string;
  companyPhone?: string;
  country?: string;
  city?: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone?: string;
  password: string;
}

export interface RegisterResponse {
  tenant: TenantRef & { url: string };
  auth: AuthResponse;
}

export interface UpdateOrganizationRequest {
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  country: string;
  city?: string | null;
  address?: string | null;
  currency: string;
  timezone: string;
}

export interface UserListParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  size: number;
  sort?: string;
}

export interface PlatformAdmin {
  id: string;
  fullName: string;
  email: string;
  lastLoginAt: string | null;
}

export interface PlatformAuthResponse extends TokenPair {
  tokenType: "Bearer";
  admin: PlatformAdmin;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  email: string;
  createdAt: string;
  userCount: number | null;
}

export interface TenantDetails extends TenantSummary {
  schemaName: string;
  phone: string | null;
  country: string;
  suspendedReason: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  updatedAt: string;
  url: string;
}

export interface TenantListParams {
  search?: string;
  status?: TenantStatus;
  page: number;
  size: number;
}
