"use client";

import { Tag } from "antd";
import type { PropertyStatus, UnitStatus } from "@/lib/api/types";
import { PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS, UNIT_STATUS_COLORS, UNIT_STATUS_LABELS } from "@/lib/labels";

export function UnitStatusTag({ status }: { status: UnitStatus }) {
  return <Tag color={UNIT_STATUS_COLORS[status].tag}>{UNIT_STATUS_LABELS[status]}</Tag>;
}

export function PropertyStatusTag({ status }: { status: PropertyStatus }) {
  return <Tag color={PROPERTY_STATUS_COLORS[status]}>{PROPERTY_STATUS_LABELS[status]}</Tag>;
}
