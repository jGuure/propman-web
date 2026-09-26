"use client";

import { Flex, Tooltip, Typography } from "antd";
import type { UnitStatus } from "@/lib/api/types";
import { UNIT_STATUS_BAR, UNIT_STATUS_LABELS } from "@/lib/labels";

const ORDER: UnitStatus[] = ["OCCUPIED", "RESERVED", "VACANT", "MAINTENANCE", "INACTIVE"];

/** A single stacked bar of unit counts per status, with a legend. */
export function StatusBar({ counts, legend = true }: { counts: Record<UnitStatus, number>; legend?: boolean }) {
  const total = ORDER.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  return (
    <div>
      <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "#f0f0f0" }}>
        {total > 0 && ORDER.filter((s) => counts[s]).map((status) => (
          <Tooltip key={status} title={`${UNIT_STATUS_LABELS[status]}: ${counts[status]}`}>
            <div style={{ width: `${(counts[status] / total) * 100}%`, background: UNIT_STATUS_BAR[status] }} />
          </Tooltip>
        ))}
      </div>
      {legend && (
        <Flex wrap gap={16} style={{ marginTop: 10 }}>
          {ORDER.map((status) => (
            <Flex key={status} align="center" gap={6}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: UNIT_STATUS_BAR[status] }} />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {UNIT_STATUS_LABELS[status]} <Typography.Text strong>{counts[status] ?? 0}</Typography.Text>
              </Typography.Text>
            </Flex>
          ))}
        </Flex>
      )}
    </div>
  );
}
