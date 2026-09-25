"use client";

import { Tag } from "antd";
import type { TenantStatus, UserRole, UserStatus } from "@/lib/api/types";

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: "gold",
  MANAGER: "blue",
  ACCOUNTANT: "purple",
  STAFF: "default",
};

const USER_STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: "green",
  INVITED: "orange",
  DISABLED: "red",
};

const TENANT_STATUS_COLORS: Record<TenantStatus, string> = {
  ACTIVE: "green",
  SUSPENDED: "red",
  PROVISIONING: "blue",
  FAILED: "default",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  STAFF: "Staff",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  DISABLED: "Disabled",
};

export function RoleTag({ role }: { role: UserRole }) {
  return <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>;
}

export function UserStatusTag({ status }: { status: UserStatus }) {
  return <Tag color={USER_STATUS_COLORS[status]}>{USER_STATUS_LABELS[status]}</Tag>;
}

export function TenantStatusTag({ status }: { status: TenantStatus }) {
  return <Tag color={TENANT_STATUS_COLORS[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Tag>;
}
