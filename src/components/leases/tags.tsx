"use client";

import { Tag } from "antd";
import { useT } from "@/i18n/provider";
import type { DepositStatus, LeaseStatus } from "@/lib/api/types";

const LEASE_COLORS: Record<LeaseStatus, string> = {
  UPCOMING: "gold",
  ACTIVE: "blue",
  ENDED: "default",
  CANCELLED: "default",
};

const DEPOSIT_COLORS: Record<DepositStatus, string> = {
  NONE: "default",
  PENDING: "orange",
  HELD: "green",
  RETURNED: "default",
  PARTLY_RETURNED: "purple",
  KEPT: "volcano",
};

export function LeaseStatusTag({ status }: { status: LeaseStatus }) {
  const { t } = useT();
  return <Tag color={LEASE_COLORS[status]} style={{ marginInlineEnd: 0 }}>{t(`leaseStatus.${status}`)}</Tag>;
}

export function DepositTag({ status }: { status: DepositStatus }) {
  const { t } = useT();
  return <Tag color={DEPOSIT_COLORS[status]} style={{ marginInlineEnd: 0 }}>{t(`depositStatus.${status}`)}</Tag>;
}

export function EndingSoonTag() {
  const { t } = useT();
  return <Tag color="orange" style={{ marginInlineEnd: 0 }}>{t("leases.endingSoon")}</Tag>;
}
