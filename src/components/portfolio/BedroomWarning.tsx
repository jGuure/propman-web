"use client";

import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";
import { useT } from "@/i18n/provider";
import type { RoomType, UnitType } from "@/lib/api/types";
import { useLabels } from "@/lib/labels";
import { bedroomMismatch } from "@/lib/room-layouts";

/** Tells when the described rooms disagree with the apartment type, with a one-click fix. */
export function BedroomWarning({ type, rooms, canEdit, onAddBedroom, onChangeType }: {
  type: UnitType; rooms: { type: RoomType }[]; canEdit: boolean; onAddBedroom: () => void; onChangeType: () => void;
}) {
  const { t } = useT();
  const labels = useLabels();
  const mismatch = bedroomMismatch(type, rooms);
  if (!mismatch) {
    return null;
  }
  const vars = { type: labels.unitType(type), described: mismatch.described, expected: mismatch.expected };
  const missing = mismatch.kind === "missing";
  return (
    <Alert type="warning" showIcon style={{ marginBottom: 12 }}
      title={t(missing ? "explorer.bedroomsMissing" : "explorer.bedroomsExtra", vars)}
      action={canEdit && (missing
        ? <Button size="small" icon={<PlusOutlined />} onClick={onAddBedroom}>{t("explorer.addBedroom")}</Button>
        : <Button size="small" icon={<EditOutlined />} onClick={onChangeType}>{t("explorer.changeType")}</Button>)} />
  );
}
