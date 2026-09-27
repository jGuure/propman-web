"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Flex, Skeleton } from "antd";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { PrintFrame } from "@/components/payments/PrintFrame";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

const label: CSSProperties = { fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.4 };
const th: CSSProperties = { textAlign: "left", fontSize: 12, color: "#666", padding: "6px 4px", borderBottom: "2px solid #ddd" };
const td: CSSProperties = { padding: "6px 4px", borderBottom: "1px solid #eee", fontSize: 13 };

interface Row {
  date: string;
  order: number;
  text: string;
  charge: number;
  paid: number;
}

/** Bills and payments of a lease with a running balance (positive = owed). */
export default function StatementPage() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const { api } = useTenant();
  const { t } = useT();
  const lease = useQuery({ queryKey: ["lease", leaseId], queryFn: () => api.lease(leaseId) });
  const account = useQuery({ queryKey: ["lease-account", leaseId], queryFn: () => api.leaseAccount(leaseId) });

  if (lease.isPending || account.isPending) {
    return <div style={{ maxWidth: 760, margin: "40px auto" }}><Skeleton active /></div>;
  }
  if (lease.error || account.error) {
    return <Alert type="error" showIcon title={errorMessage(lease.error ?? account.error)} style={{ maxWidth: 760, margin: "40px auto" }} />;
  }
  const l = lease.data;
  const a = account.data;
  const rows: Row[] = [
    ...a.charges.filter((c) => c.status !== "VOID").map((c) => ({
      date: c.dueDate, order: 0, text: t("receipts.rentFor", { month: dayjs(c.period).format("MMMM YYYY") }), charge: c.amount, paid: 0,
    })),
    ...a.payments.filter((p) => !p.reversed).map((p) => ({
      date: p.paidOn, order: 1,
      text: t("receipts.paymentLine", { number: p.receiptNumber, method: t(`paymentMethod.${p.method}`) }) + (p.reference ? ` · ${p.reference}` : ""),
      charge: 0, paid: p.amount,
    })),
  ].sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order);
  const balances = rows.reduce<number[]>((acc, r) => [...acc, (acc.at(-1) ?? 0) + r.charge - r.paid], []);
  const place = [l.unit.propertyName, l.unit.buildingName, l.unit.unitNumber, l.room?.name].filter(Boolean).join(" · ");

  return (
    <PrintFrame title={t("receipts.statement")}>
      <Flex justify="space-between" wrap gap={24} style={{ marginBottom: 20 }}>
        <div>
          <div style={label}>{t("leases.resident")}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{l.resident.fullName}</div>
          <div style={{ fontSize: 13 }}>{l.resident.phone}</div>
        </div>
        <div>
          <div style={label}>{t("receipts.place")}</div>
          <div style={{ fontSize: 14 }}>{place}</div>
          <div style={{ fontSize: 13, color: "#555" }}>
            {t("receipts.lease")}: {formatDate(l.startDate)}{l.movedOutOn ? ` – ${formatDate(l.movedOutOn)}` : ""} ·{" "}
            {t("receipts.rent")}: {formatMoney(l.monthlyRent)}
          </div>
        </div>
      </Flex>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={th}>{t("receipts.date")}</th>
            <th style={th}>{t("receipts.description")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("receipts.charges")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("receipts.payments")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("receipts.balance")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{formatDate(r.date)}</td>
                <td style={td}>{r.text}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.charge ? formatMoney(r.charge) : ""}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.paid ? formatMoney(r.paid) : ""}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{formatMoney(balances[i])}</td>
              </tr>
          ))}
        </tbody>
      </table>
      <Flex justify="end" gap={32} style={{ fontSize: 14 }}>
        <div>{t("receipts.owedNow")}: <strong style={{ color: a.summary.owed > 0 ? "#cf1322" : undefined }}>{formatMoney(a.summary.owed)}</strong></div>
        {a.summary.credit > 0 && <div>{t("payments.credit", { amount: formatMoney(a.summary.credit) })}</div>}
        {a.summary.paidUntil && <div>{t("payments.paidUntil", { month: dayjs(a.summary.paidUntil).format("MMMM YYYY") })}</div>}
      </Flex>
      <div style={{ textAlign: "right", fontSize: 12, color: "#666", marginTop: 24 }}>
        {t("receipts.printed", { date: formatDateTime(new Date().toISOString()) })}
      </div>
    </PrintFrame>
  );
}
