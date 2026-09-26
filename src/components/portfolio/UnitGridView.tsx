"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Empty, Flex, Segmented, Skeleton, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Building } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatMoney } from "@/lib/format";
import { UNIT_STATUS_COLORS, UNIT_STATUSES, useLabels } from "@/lib/labels";

const NO_BUILDING = "none";

interface Props {
  propertyId: string;
  buildings: Building[];
  onOpenUnit: (unitId: string) => void;
}

/** Floors as rows (top floor first) and units as tiles colored by status. */
export function UnitGridView({ propertyId, buildings, onOpenUnit }: Props) {
  const { api } = useTenant();
  const { t } = useT();
  const labels = useLabels();
  const active = buildings.filter((b) => b.status === "ACTIVE");
  const [selected, setSelected] = useState<string>(active[0]?.id ?? NO_BUILDING);
  const buildingId = selected === NO_BUILDING ? undefined : selected;
  const grid = useQuery({
    queryKey: ["unit-grid", propertyId, buildingId ?? NO_BUILDING],
    queryFn: () => api.unitGrid(propertyId, buildingId),
  });

  const options = [
    ...active.map((b) => ({ value: b.id, label: b.name })),
    { value: NO_BUILDING, label: active.length ? t("apartments.noFlat") : t("dashboard.allApartments") },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        {options.length > 1 ? <Segmented options={options} value={selected} onChange={(v) => setSelected(String(v))} />
          : <span />}
        {grid.data && (
          <Flex wrap gap={12}>
            {UNIT_STATUSES.map((status) => (
              <Flex key={status} align="center" gap={6}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3, background: UNIT_STATUS_COLORS[status].fill,
                  border: `1px solid ${UNIT_STATUS_COLORS[status].border}`,
                }} />
                <Typography.Text style={{ fontSize: 13 }}>
                  {labels.unitStatus(status)} ({grid.data.counts[status] ?? 0})
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
      {grid.isPending && <Skeleton active />}
      {grid.error && <Alert type="error" showIcon title={errorMessage(grid.error)} />}
      {grid.data && grid.data.floors.every((f) => f.units.length === 0) && (
        <Empty description={t("apartments.empty")} />
      )}
      {grid.data && grid.data.floors.some((f) => f.units.length > 0) && (
        <Flex vertical gap={8}>
          {grid.data.floors.map((floor) => (
            <Flex key={floor.floor} gap={12} align="stretch">
              <div style={{ width: 84, flexShrink: 0, paddingTop: 10 }}>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>{labels.floor(floor.floor)}</Typography.Text>
              </div>
              <Flex wrap gap={8} style={{ flex: 1, minHeight: 64, padding: 6, background: "#fafafa", borderRadius: 8 }}>
                {floor.units.map((tile) => {
                  const colors = UNIT_STATUS_COLORS[tile.status];
                  return (
                    <Tooltip key={tile.id} title={`${labels.unitType(tile.type)} · ${labels.unitStatus(tile.status)}`}>
                      <button type="button" onClick={() => onOpenUnit(tile.id)}
                        style={{
                          width: 104, padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                          background: colors.fill, border: `1px solid ${colors.border}`, color: colors.text,
                        }}>
                        <div style={{ fontWeight: 600 }}>{tile.unitNumber}</div>
                        <div style={{ fontSize: 12 }}>{formatMoney(tile.baseRent)}</div>
                      </button>
                    </Tooltip>
                  );
                })}
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
