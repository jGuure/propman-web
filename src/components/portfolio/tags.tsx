"use client";

import { Tag } from "antd";
import type { PropertyStatus, UnitStatus } from "@/lib/api/types";
import { PROPERTY_STATUS_COLORS, UNIT_STATUS_COLORS, useLabels } from "@/lib/labels";

export function UnitStatusTag({ status }: { status: UnitStatus }) {
  const labels = useLabels();
  return <Tag color={UNIT_STATUS_COLORS[status].tag}>{labels.unitStatus(status)}</Tag>;
}

export function PropertyStatusTag({ status }: { status: PropertyStatus }) {
  const labels = useLabels();
  return <Tag color={PROPERTY_STATUS_COLORS[status]}>{labels.propertyStatus(status)}</Tag>;
}
