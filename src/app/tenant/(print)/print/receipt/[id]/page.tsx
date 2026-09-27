"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Flex, Result, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { PrintFrame } from "@/components/payments/PrintFrame";
import { useT } from "@/i18n/provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

const label: CSSProperties = { fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.4 };
const cell: CSSProperties = { padding: "6px 0", borderBottom: "1px solid #eee" };

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useTenant();
  const { t } = useT();
  const receipt = useQuery({ queryKey: ["receipt", id], queryFn: () => api.paymentReceipt(id) });
  const org = useQuery({ queryKey: ["organization"], queryFn: api.organization });

  if (receipt.isPending) {
    return <div style={{ maxWidth: 760, margin: "40px auto" }}><Skeleton active /></div>;
  }
  if (receipt.error) {
    return isApiError(receipt.error, "NOT_FOUND") ? <Result status="404" title={t("receipts.notFound")} />
      : <Alert type="error" showIcon title={errorMessage(receipt.error)} style={{ maxWidth: 760, margin: "40px auto" }} />;
  }
  const { payment: p, lease: l, covers, advance } = receipt.data;
  const place = [l.unit.propertyName, l.unit.buildingName, l.unit.unitNumber, l.room?.name].filter(Boolean).join(" · ");
  const text = t("receipts.whatsappText", {
    org: org.data?.name ?? "", number: p.receiptNumber, amount: formatMoney(p.amount), date: formatDate(p.paidOn), place,
  });

  return (
    <PrintFrame title={t("receipts.receipt")} number={p.receiptNumber} whatsapp={{ phone: l.resident.phone, text }}>
      <div style={{ position: "relative" }}>
        {p.reversed && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 64, fontWeight: 800, color: "rgba(207,19,34,.18)", transform: "rotate(-18deg)", pointerEvents: "none",
          }}>{t("receipts.reversed")}</div>
        )}
        <Flex justify="space-between" wrap gap={24} style={{ marginBottom: 24 }}>
          <div>
            <div style={label}>{t("receipts.receivedFrom")}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{l.resident.fullName}</div>
            <div style={{ fontSize: 13 }}>{l.resident.phone}</div>
          </div>
          <div>
            <div style={label}>{t("receipts.place")}</div>
            <div style={{ fontSize: 14 }}>{place}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={label}>{t("receipts.date")}</div>
            <div style={{ fontSize: 14 }}>{formatDate(p.paidOn)}</div>
          </div>
        </Flex>

        <div style={{ background: "#f0fbf9", border: "1px solid #b7e4dc", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
          <div style={label}>{t("receipts.amount")}</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{formatMoney(p.amount)}</div>
          <div style={{ fontSize: 13 }}>
            {t("receipts.method")}: {t(`paymentMethod.${p.method}`)}{p.reference ? ` · ${t("receipts.reference")}: ${p.reference}` : ""}
          </div>
        </div>

        {covers.length > 0 && (
          <>
            <div style={{ ...label, marginBottom: 4 }}>{t("receipts.paidFor")}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 12 }}>
              <tbody>
                {covers.map((c) => (
                  <tr key={c.period}>
                    <td style={cell}>{t("receipts.rentFor", { month: dayjs(c.period).format("MMMM YYYY") })}</td>
                    <td style={{ ...cell, color: "#666", fontSize: 12 }}>{c.full ? t("receipts.inFull") : t("receipts.part")}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{formatMoney(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {advance > 0 && <Typography.Paragraph style={{ fontSize: 13 }}>{t("receipts.advance", { amount: formatMoney(advance) })}</Typography.Paragraph>}
        {p.note && <Typography.Paragraph style={{ fontSize: 13 }}>{p.note}</Typography.Paragraph>}
        {p.reversed && <Alert type="error" showIcon title={t("receipts.reversedNote")} description={p.reverseReason} style={{ marginBottom: 12 }} />}

        <Flex justify="space-between" align="end" wrap gap={16} style={{ marginTop: 32 }}>
          <div>
            <div style={label}>{t("receipts.receivedBy")}</div>
            <div style={{ fontSize: 14, minWidth: 200, borderBottom: "1px solid #999", paddingBottom: 4, marginTop: 20 }}>
              {p.receivedByName ?? ""}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#666" }}>
            <div style={{ fontSize: 15, color: "#0f766e", fontWeight: 600 }}>{t("receipts.thanks")}</div>
            {t("receipts.printed", { date: formatDateTime(new Date().toISOString()) })}
          </div>
        </Flex>
      </div>
    </PrintFrame>
  );
}
