"use client";

import { Flex, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useT } from "@/i18n/provider";
import type { AccountSummary } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

/** "Owes $450" / "Paid until December 2026" / "Credit $600" at a glance. */
export function AccountLine({ account, large = false }: { account: AccountSummary; large?: boolean }) {
  const { t } = useT();
  const size = large ? 15 : 13;
  return (
    <Flex gap={6} align="center" wrap>
      {account.owed > 0 ? (
        <Tag color="red" style={{ marginInlineEnd: 0, fontSize: size }}>{t("payments.owes", { amount: formatMoney(account.owed) })}</Tag>
      ) : account.paidUntil ? (
        <Tag color="green" style={{ marginInlineEnd: 0, fontSize: size }}>
          {t("payments.paidUntil", { month: dayjs(account.paidUntil).format("MMM YYYY") })}
        </Tag>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: size }}>{t("payments.upToDate")}</Typography.Text>
      )}
      {account.credit > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: size }}>{t("payments.credit", { amount: formatMoney(account.credit) })}</Typography.Text>
      )}
    </Flex>
  );
}
