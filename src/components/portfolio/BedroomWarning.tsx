"use client";

import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button } from "antd";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Room, UnitType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { useLabels } from "@/lib/labels";
import { bedroomMismatch } from "@/lib/room-layouts";
import { invalidatePortfolio } from "./invalidate";

/**
 * Tells when the described rooms disagree with the apartment type. Missing bedrooms are added in one click
 * ("Bedroom 1", "Bedroom 2"… skipping names already used); too many bedrooms lead to changing the type.
 */
export function BedroomWarning({ unitId, type, rooms, canEdit, onChangeType }: {
  unitId: string; type: UnitType; rooms: Pick<Room, "name" | "type">[]; canEdit: boolean; onChangeType: () => void;
}) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const labels = useLabels();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const mismatch = bedroomMismatch(type, rooms);
  const missing = mismatch?.kind === "missing" ? mismatch.expected - mismatch.described : 0;

  const add = useMutation({
    mutationFn: async () => {
      const base = labels.roomType("BEDROOM");
      const used = new Set(rooms.map((r) => r.name.toLowerCase()));
      let n = 1;
      for (let i = 0; i < missing; i++) {
        while (used.has(`${base} ${n}`.toLowerCase())) {
          n++;
        }
        used.add(`${base} ${n}`.toLowerCase());
        await api.addRoom(unitId, { name: `${base} ${n}`, type: "BEDROOM" });
      }
    },
    onSuccess: () => {
      message.success(tn("explorer.bedroomsAdded", missing));
      invalidatePortfolio(queryClient);
    },
    onError: (error) => {
      message.error(errorMessage(error));
      invalidatePortfolio(queryClient);
    },
  });

  if (!mismatch) {
    return null;
  }
  const vars = { type: labels.unitType(type), described: mismatch.described, expected: mismatch.expected };
  return (
    <Alert type="warning" showIcon style={{ marginBottom: 12 }}
      title={t(missing ? "explorer.bedroomsMissing" : "explorer.bedroomsExtra", vars)}
      action={canEdit && (missing
        ? <Button size="small" icon={<PlusOutlined />} loading={add.isPending} onClick={() => add.mutate()}>
          {tn("explorer.addBedrooms", missing)}
        </Button>
        : <Button size="small" icon={<EditOutlined />} onClick={onChangeType}>{t("explorer.changeType")}</Button>)} />
  );
}
