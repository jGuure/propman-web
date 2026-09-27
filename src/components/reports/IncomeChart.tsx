"use client";

import { Flex, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useT } from "@/i18n/provider";
import type { IncomeRow } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

/** Categorical slots 1 and 2 of the validated chart palette (never the status green/red). */
const RECEIVED = "#2a78d6";
const EXPENSES = "#eb6834";
const HEIGHT = 200;

/** Rounds the axis maximum up to 1, 2 or 5 × a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) {
    return 100;
  }
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value)!;
  return step * power;
}

/** Received vs expenses per month as grouped bars; hover a month for the numbers (the table below has them all). */
export function IncomeChart({ months }: { months: IncomeRow[] }) {
  const { t } = useT();
  const max = niceMax(Math.max(...months.map((m) => Math.max(m.received, m.expenses))));
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <div>
      <Flex gap={16} style={{ marginBottom: 12, fontSize: 13 }}>
        {[[RECEIVED, t("reports.received")], [EXPENSES, t("reports.expenses")]].map(([color, label]) => (
          <Flex key={label} align="center" gap={6}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <Typography.Text type="secondary">{label}</Typography.Text>
          </Flex>
        ))}
      </Flex>
      <div style={{ position: "relative", height: HEIGHT, marginLeft: 56 }}>
        {ticks.map((tick) => (
          <div key={tick} style={{ position: "absolute", left: 0, right: 0, bottom: (tick / max) * HEIGHT, borderTop: "1px solid #eef0f0" }}>
            <span style={{ position: "absolute", left: -56, top: -9, width: 50, textAlign: "right", fontSize: 11, color: "#8a8a86" }}>
              {formatMoney(tick)}
            </span>
          </div>
        ))}
        <Flex style={{ position: "absolute", inset: 0 }} align="flex-end">
          {months.map((m) => (
            <Tooltip key={m.month} title={
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{dayjs(m.month).format("MMMM YYYY")}</div>
                <div>{t("reports.billed")}: {formatMoney(m.billed)}</div>
                <div>{t("reports.received")}: {formatMoney(m.received)}</div>
                <div>{t("reports.expenses")}: {formatMoney(m.expenses)}</div>
                <div style={{ fontWeight: 600 }}>{t("reports.net")}: {formatMoney(m.net)}</div>
              </div>
            }>
              {/* the whole month column is the hover target, bigger than the bars */}
              <Flex flex={1} justify="center" align="flex-end" gap={2} style={{ height: "100%", cursor: "default" }}>
                {[[m.received, RECEIVED], [m.expenses, EXPENSES]].map(([value, color]) => (
                  <div key={color as string} style={{
                    width: 14, height: Math.max((value as number) > 0 ? 2 : 0, ((value as number) / max) * HEIGHT),
                    background: color as string, borderRadius: "4px 4px 0 0",
                  }} />
                ))}
              </Flex>
            </Tooltip>
          ))}
        </Flex>
      </div>
      <Flex style={{ marginLeft: 56, marginTop: 6 }}>
        {months.map((m) => (
          <div key={m.month} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#8a8a86" }}>{dayjs(m.month).format("MMM")}</div>
        ))}
      </Flex>
    </div>
  );
}
