"use client";

import { Tag } from "antd";
import { useT } from "@/i18n/provider";
import type { ChargeStatus } from "@/lib/api/types";

const COLORS: Record<ChargeStatus, string> = {
  DUE: "blue",
  UNCONFIRMED: "orange",
  PARTLY_PAID: "gold",
  OVERDUE: "red",
  PAID: "green",
  VOID: "default",
};

export function ChargeStatusTag({ status }: { status: ChargeStatus }) {
  const { t } = useT();
  return <Tag color={COLORS[status]} style={{ marginInlineEnd: 0 }}>{t(`chargeStatus.${status}`)}</Tag>;
}
