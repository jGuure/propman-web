"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Skeleton } from "antd";
import dayjs from "dayjs";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { PrintFrame } from "@/components/payments/PrintFrame";
import { IncomeChart } from "@/components/reports/IncomeChart";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatDateTime, formatMoney, formatPercent } from "@/lib/format";

const th: CSSProperties = { textAlign: "left", fontSize: 10, color: "#555", padding: "6px 4px", borderBottom: "2px solid #333", textTransform: "uppercase", letterSpacing: 0.2 };
const td: CSSProperties = { padding: "6px 4px", borderBottom: "1px solid #e5e5e5", fontSize: 12, verticalAlign: "top" };
const right: CSSProperties = { textAlign: "right" };
const totalRow: CSSProperties = { fontWeight: 700, borderTop: "2px solid #333" };

/** A plain document table: full width, header repeated on every printed page. */
function DocTable({ head, rows, total, alignRight = [] }: {
  head: string[]; rows: ReactNode[][]; total?: ReactNode[]; alignRight?: number[];
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
      <thead>
        <tr>{head.map((h, i) => <th key={i} style={alignRight.includes(i) ? { ...th, ...right } : th}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>{row.map((cell, i) => <td key={i} style={alignRight.includes(i) ? { ...td, ...right } : td}>{cell}</td>)}</tr>
        ))}
        {total && (
          <tr>{total.map((cell, i) => <td key={i} style={{ ...td, ...totalRow, ...(alignRight.includes(i) ? right : {}) }}>{cell}</td>)}</tr>
        )}
      </tbody>
    </table>
  );
}

function Summary({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "flex", gap: 0, border: "1px solid #ddd", borderRadius: 6, marginBottom: 18 }}>
      {items.map(([label, value], i) => (
        <div key={label} style={{ flex: 1, padding: "8px 12px", borderLeft: i ? "1px solid #ddd" : undefined }}>
          <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 6px" }}>{children}</div>;
}

function Printed() {
  const { t } = useT();
  return <div style={{ textAlign: "right", fontSize: 11, color: "#666" }}>{t("receipts.printed", { date: formatDateTime(new Date().toISOString()) })}</div>;
}

function IncomeDoc({ from, to, propertyId, propertyName }: { from: string; to: string; propertyId?: string; propertyName: string }) {
  const { api } = useTenant();
  const { t } = useT();
  const report = useQuery({ queryKey: ["report-income", from, to, propertyId], queryFn: () => api.incomeReport({ from: `${from}-01`, to: `${to}-01`, propertyId }) });
  if (report.isPending) return <Skeleton active />;
  if (report.error) return <Alert type="error" showIcon title={errorMessage(report.error)} />;
  const r = report.data;
  const cols = [t("reports.billed"), t("reports.received"), t("reports.expenses"), t("reports.net")];
  return (
    <PrintFrame title={t("reports.tabIncome")}
      subtitle={`${dayjs(r.from).format("MMM YYYY")} – ${dayjs(r.to).format("MMM YYYY")} · ${propertyName}`}>
      <Summary items={[[cols[0], formatMoney(r.totals.billed)], [cols[1], formatMoney(r.totals.received)],
        [cols[2], formatMoney(r.totals.expenses)], [cols[3], formatMoney(r.totals.net)]]} />
      <div style={{ marginBottom: 18 }}><IncomeChart months={r.months} /></div>
      <Section>{t("reports.perMonth")}</Section>
      <DocTable head={[t("reports.month"), ...cols]} alignRight={[1, 2, 3, 4]}
        rows={r.months.map((m) => [dayjs(m.month).format("MMMM YYYY"), formatMoney(m.billed), formatMoney(m.received), formatMoney(m.expenses), formatMoney(m.net)])}
        total={[t("reports.total"), formatMoney(r.totals.billed), formatMoney(r.totals.received), formatMoney(r.totals.expenses), formatMoney(r.totals.net)]} />
      {!propertyId && r.byProperty.length > 1 && (
        <>
          <Section>{t("reports.perProperty")}</Section>
          <DocTable head={[t("reports.property"), ...cols]} alignRight={[1, 2, 3, 4]}
            rows={r.byProperty.map((p) => [p.propertyName, formatMoney(p.billed), formatMoney(p.received), formatMoney(p.expenses), formatMoney(p.net)])} />
        </>
      )}
      <Printed />
    </PrintFrame>
  );
}

function ArrearsDoc({ propertyId, propertyName }: { propertyId?: string; propertyName: string }) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const report = useQuery({ queryKey: ["report-arrears", propertyId], queryFn: () => api.arrearsReport(propertyId) });
  if (report.isPending) return <Skeleton active />;
  if (report.error) return <Alert type="error" showIcon title={errorMessage(report.error)} />;
  const r = report.data;
  return (
    <PrintFrame title={t("reports.tabArrears")} subtitle={`${formatDate(r.asOf)} · ${propertyName}`}>
      <Summary items={[[t("reports.totalOwed"), formatMoney(r.total)], [t("reports.residentsOwing"), String(r.residents)]]} />
      {r.rows.length === 0 ? <p>{t("reports.nobodyOwes")}</p> : (
        <DocTable alignRight={[3, 4]}
          head={[t("reports.resident"), t("residents.phone"), t("reports.apartment"), t("reports.owed"), t("reports.unpaidMonths"), t("reports.oldestDue"), t("reports.lastPayment")]}
          rows={r.rows.map((row) => [
            row.residentName, <span key="phone" style={{ whiteSpace: "nowrap" }}>{row.residentPhone}</span>,
            <>{row.unitNumber}{row.roomName ? ` · ${row.roomName}` : ""}<div style={{ color: "#666", fontSize: 11 }}>{[row.propertyName, row.buildingName].filter(Boolean).join(" · ")}</div></>,
            formatMoney(row.owed), row.unpaidMonths,
            <>{formatDate(row.oldestDueDate)}<div style={{ color: "#666", fontSize: 11 }}>{row.daysOverdue === 0 ? t("reports.dueToday") : tn("reports.daysOverdue", row.daysOverdue)}</div></>,
            row.lastPaymentOn ? formatDate(row.lastPaymentOn) : t("reports.never"),
          ])}
          total={[t("reports.total"), "", "", formatMoney(r.total), "", "", ""]} />
      )}
      <Printed />
    </PrintFrame>
  );
}

function OccupancyDoc() {
  const { api } = useTenant();
  const { t } = useT();
  const report = useQuery({ queryKey: ["report-occupancy"], queryFn: () => api.occupancyReport() });
  if (report.isPending) return <Skeleton active />;
  if (report.error) return <Alert type="error" showIcon title={errorMessage(report.error)} />;
  const r = report.data;
  const row = (x: typeof r.totals) => [x.total, x.occupied, x.reserved, x.available, x.maintenance, formatPercent(x.occupancyRate), formatMoney(x.rentRoll), formatMoney(x.potentialRent)];
  return (
    <PrintFrame title={t("reports.tabOccupancy")} subtitle={formatDate(new Date().toISOString())}>
      <Summary items={[[t("reports.occupancy"), formatPercent(r.totals.occupancyRate)], [t("reports.available"), String(r.totals.available)],
        [t("reports.rentRoll"), formatMoney(r.totals.rentRoll)], [t("reports.potential"), formatMoney(r.totals.potentialRent)]]} />
      <DocTable alignRight={[1, 2, 3, 4, 5, 6, 7, 8]}
        head={[t("reports.property"), t("reports.apartments"), t("reports.occupied"), t("reports.reserved"), t("reports.available"),
          t("reports.maintenance"), t("reports.occupancy"), t("reports.rentRoll"), t("reports.potential")]}
        rows={r.properties.map((p) => [p.propertyName, ...row(p)])}
        total={[t("reports.total"), ...row(r.totals)]} />
      <Printed />
    </PrintFrame>
  );
}

function ReportDocument() {
  const { kind } = useParams<{ kind: string }>();
  const params = useSearchParams();
  const { api } = useTenant();
  const { t } = useT();
  const propertyId = params.get("propertyId") ?? undefined;
  const properties = useQuery({
    queryKey: ["properties", "options"], queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }), enabled: !!propertyId,
  });
  const propertyName = propertyId ? properties.data?.content.find((p) => p.id === propertyId)?.name ?? "" : t("reports.allProperties");
  if (kind === "arrears") return <ArrearsDoc propertyId={propertyId} propertyName={propertyName} />;
  if (kind === "occupancy") return <OccupancyDoc />;
  const to = params.get("to") ?? dayjs().format("YYYY-MM");
  const from = params.get("from") ?? dayjs(`${to}-01`).subtract(5, "month").format("YYYY-MM");
  return <IncomeDoc from={from} to={to} propertyId={propertyId} propertyName={propertyName} />;
}

export default function Page() {
  return (
    <Suspense>
      <ReportDocument />
    </Suspense>
  );
}
