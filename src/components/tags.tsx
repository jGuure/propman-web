"use client";

import { Tag } from "antd";
import type { TenantStatus, UserRole, UserStatus } from "@/lib/api/types";
import { useLabels } from "@/lib/labels";

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
  PENDING_REVIEW: "gold",
  FAILED: "default",
};

export function RoleTag({ role }: { role: UserRole }) {
  const labels = useLabels();
  return <Tag color={ROLE_COLORS[role]}>{labels.role(role)}</Tag>;
}

export function UserStatusTag({ status }: { status: UserStatus }) {
  const labels = useLabels();
  return <Tag color={USER_STATUS_COLORS[status]}>{labels.userStatus(status)}</Tag>;
}

/** Platform admin area (English only). */
export function TenantStatusTag({ status }: { status: TenantStatus }) {
  const label = status === "PENDING_REVIEW" ? "Waiting for review" : status.charAt(0) + status.slice(1).toLowerCase();
  return <Tag color={TENANT_STATUS_COLORS[status]}>{label}</Tag>;
}
