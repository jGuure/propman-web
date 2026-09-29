"use client";

import { DownloadOutlined, PhoneOutlined, PrinterOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, DatePicker, Empty, Flex, Progress, Result, Select, Skeleton, Tabs, Tooltip, Typography, type TableProps } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { openPrintPreview } from "@/components/payments/PrintPreview";
import { whatsappNumber } from "@/components/payments/PrintFrame";
import { IncomeChart } from "@/components/reports/IncomeChart";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { ArrearsRow, IncomeRow, OccupancyRow } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

function Tile({ label, value, help, tone }: { label: string; value: string; help?: string; tone?: "good" | "bad" }) {
  return (
    <div style={{ flex: "1 1 160px", padding: "10px 14px", background: "#fff", border: "1px solid #eef0f0", borderRadius: 10 }}>
      <Tooltip title={help}><Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text></Tooltip>
      <div style={{ fontWeight: 600, fontSize: 20, color: tone === "bad" ? "#cf1322" : tone === "good" ? "#16a34a" : undefined }}>{value}</div>
    </div>
  );
}

function Toolbar({ children, onExport, printHref }: { children?: ReactNode; onExport?: () => void; printHref: string }) {
  const { t } = useT();
  return (
    <Flex className="no-print" justify="space-between" wrap gap={12} style={{ marginBottom: 16 }}>
      <Flex gap={12} wrap>{children}</Flex>
      <Flex gap={8}>
        {onExport && <Button icon={<DownloadOutlined />} onClick={onExport}>{t("reports.exportCsv")}</Button>}
        <Button icon={<PrinterOutlined />} onClick={() => openPrintPreview(printHref)}>{t("reports.print")}</Button>
      </Flex>
    </Flex>
  );
}

function PropertyFilter({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const { api } = useTenant();
  const { t } = useT();
  const properties = useQuery({
    queryKey: ["properties", "options"], queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }),
  });
  return (
    <Select allowClear placeholder={t("reports.allProperties")} style={{ width: 220 }} value={value} onChange={onChange}
      showSearch={{ optionFilterProp: "label" }}
      options={(properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
  );
}

function IncomeTab() {
  const { api } = useTenant();
  const { t } = useT();
  const url = useUrlState();
  const to = url.get("to") ?? dayjs().format("YYYY-MM");
  const from = url.get("from") ?? dayjs(`${to}-01`).subtract(5, "month").format("YYYY-MM");
  const propertyId = url.get("propertyId");
  const report = useQuery({
    queryKey: ["report-income", from, to, propertyId],
    queryFn: () => api.incomeReport({ from: `${from}-01`, to: `${to}-01`, propertyId }),
  });
  const r = report.data;
  const money = (key: keyof IncomeRow) => ({ title: t(`reports.${key === "billed" ? "billed" : key}` as "reports.billed"), key, align: "right" as const,
    render: (_: unknown, row: IncomeRow) => formatMoney(row[key] as number) });
  const monthColumns: TableProps<IncomeRow>["columns"] = [
    { title: t("reports.month"), key: "month", render: (_, row) => (row.month ? dayjs(row.month).format("MMMM YYYY") : <strong>{t("reports.total")}</strong>) },
    money("billed"), money("received"), money("expenses"),
    {
      title: t("reports.net"), key: "net", align: "right",
      render: (_, row) => <Typography.Text strong type={row.net < 0 ? "danger" : undefined}>{formatMoney(row.net)}</Typography.Text>,
    },
  ];

  const exportCsv = () => r && downloadCsv(`income-${from}-to-${to}.csv`,
    [t("reports.month"), t("reports.billed"), t("reports.received"), t("reports.expenses"), t("reports.net")],
    [...r.months.map((m) => [dayjs(m.month).format("YYYY-MM"), m.billed, m.received, m.expenses, m.net]),
      [t("reports.total"), r.totals.billed, r.totals.received, r.totals.expenses, r.totals.net]]);

  return (
    <>
      <Toolbar onExport={exportCsv}
        printHref={`/print/report/income?from=${from}&to=${to}${propertyId ? `&propertyId=${propertyId}` : ""}`}>
        <DatePicker.RangePicker picker="month" allowClear={false} format="MMM YYYY"
          value={[dayjs(`${from}-01`), dayjs(`${to}-01`)]}
          onChange={(v) => v?.[0] && v?.[1] && url.set({ from: v[0].format("YYYY-MM"), to: v[1].format("YYYY-MM") })} />
        <PropertyFilter value={propertyId} onChange={(v) => url.set({ propertyId: v })} />
      </Toolbar>
      {report.error && <Alert type="error" showIcon title={errorMessage(report.error)} />}
      {report.isPending && <Skeleton active />}
      {r && (
        <>
          <Flex gap={10} wrap style={{ marginBottom: 16 }}>
            <Tile label={t("reports.billed")} value={formatMoney(r.totals.billed)} />
            <Tile label={t("reports.received")} value={formatMoney(r.totals.received)} />
            <Tile label={t("reports.expenses")} value={formatMoney(r.totals.expenses)} />
            <Tile label={t("reports.net")} help={t("reports.netHelp")} value={formatMoney(r.totals.net)}
              tone={r.totals.net < 0 ? "bad" : "good"} />
          </Flex>
          <Card size="small" style={{ marginBottom: 16 }}>
            {r.months.every((m) => !m.received && !m.expenses)
              ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("reports.noData")} />
              : <IncomeChart months={r.months} />}
          </Card>
          <Typography.Title level={5}>{t("reports.perMonth")}</Typography.Title>
          <ResponsiveTable<IncomeRow> rowKey={(row) => row.month ?? "total"} size="small" pagination={false} columns={monthColumns}
            dataSource={[...r.months, r.totals]} scroll={{ x: 560 }} style={{ marginBottom: 20 }} />
          {!propertyId && r.byProperty.length > 1 && (
            <>
              <Typography.Title level={5}>{t("reports.perProperty")}</Typography.Title>
              <ResponsiveTable rowKey="propertyId" size="small" pagination={false} dataSource={r.byProperty} scroll={{ x: 560 }}
                columns={[
                  { title: t("reports.property"), dataIndex: "propertyName" },
                  { title: t("reports.billed"), align: "right", render: (_, p) => formatMoney(p.billed) },
                  { title: t("reports.received"), align: "right", render: (_, p) => formatMoney(p.received) },
                  { title: t("reports.expenses"), align: "right", render: (_, p) => formatMoney(p.expenses) },
                  { title: t("reports.net"), align: "right", render: (_, p) => <strong>{formatMoney(p.net)}</strong> },
                ]} />
            </>
          )}
        </>
      )}
    </>
  );
}

function ArrearsTab() {
  const { api } = useTenant();
  const { t, tn } = useT();
  const url = useUrlState();
  const propertyId = url.get("propertyId");
  const report = useQuery({ queryKey: ["report-arrears", propertyId], queryFn: () => api.arrearsReport(propertyId) });
  const r = report.data;
  const columns: TableProps<ArrearsRow>["columns"] = [
    {
      title: t("reports.resident"), key: "resident",
      render: (_, row) => (
        <Flex vertical>
          <Link href={`/residents/${row.residentId}`}><Typography.Text strong>{row.residentName}</Typography.Text></Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.residentPhone}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t("reports.apartment"), key: "unit",
      render: (_, row) => (
        <Flex vertical>
          <Link href={`/units/${row.unitId}`}>{row.unitNumber}{row.roomName ? ` · ${row.roomName}` : ""}</Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{[row.propertyName, row.buildingName].filter(Boolean).join(" · ")}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t("reports.owed"), key: "owed", align: "right",
      render: (_, row) => <Typography.Text strong type="danger">{formatMoney(row.owed)}</Typography.Text>,
    },
    { title: t("reports.unpaidMonths"), key: "months", align: "right", render: (_, row) => row.unpaidMonths },
    {
      title: t("reports.oldestDue"), key: "oldest",
      render: (_, row) => (
        <Flex vertical>
          <span>{formatDate(row.oldestDueDate)}</span>
          <Typography.Text type={row.daysOverdue > 30 ? "danger" : "secondary"} style={{ fontSize: 12 }}>
            {row.daysOverdue === 0 ? t("reports.dueToday") : tn("reports.daysOverdue", row.daysOverdue)}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: t("reports.lastPayment"), key: "last", render: (_, row) => (row.lastPaymentOn ? formatDate(row.lastPaymentOn) : t("reports.never")) },
    {
      key: "contact", align: "right", className: "no-print",
      render: (_, row) => {
        const wa = whatsappNumber(row.residentPhone);
        return (
          <Flex gap={4} justify="end">
            <a href={`tel:${row.residentPhone.replace(/[^+\d]/g, "")}`}><Button size="small" icon={<PhoneOutlined />} aria-label={t("reports.call")} /></a>
            <a href={`https://wa.me/${wa ?? ""}`} target="_blank" rel="noreferrer">
              <Button size="small" icon={<WhatsAppOutlined />} style={{ color: "#128c4b" }} aria-label="WhatsApp" />
            </a>
          </Flex>
        );
      },
    },
  ];
  const exportCsv = () => r && downloadCsv(`late-payers-${r.asOf}.csv`,
    [t("reports.resident"), t("residents.phone"), t("reports.apartment"), t("reports.property"), t("reports.owed"),
      t("reports.unpaidMonths"), t("reports.oldestDue"), t("reports.lastPayment")],
    r.rows.map((row) => [row.residentName, row.residentPhone, `${row.unitNumber}${row.roomName ? ` ${row.roomName}` : ""}`,
      row.propertyName, row.owed, row.unpaidMonths, row.oldestDueDate, row.lastPaymentOn ?? ""]));

  return (
    <>
      <Toolbar onExport={exportCsv} printHref={`/print/report/arrears${propertyId ? `?propertyId=${propertyId}` : ""}`}>
        <PropertyFilter value={propertyId} onChange={(v) => url.set({ propertyId: v })} />
      </Toolbar>
      {report.error && <Alert type="error" showIcon title={errorMessage(report.error)} />}
      {report.isPending && <Skeleton active />}
      {r && (
        <>
          <Flex gap={10} wrap style={{ marginBottom: 16 }}>
            <Tile label={t("reports.totalOwed")} value={formatMoney(r.total)} tone={r.total > 0 ? "bad" : undefined} />
            <Tile label={t("reports.residentsOwing")} value={String(r.residents)} />
          </Flex>
          <ResponsiveTable<ArrearsRow> rowKey="leaseId" size="middle" columns={columns} dataSource={r.rows} pagination={false}
            scroll={{ x: 820 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("reports.nobodyOwes")} /> }} />
        </>
      )}
    </>
  );
}

function OccupancyTab() {
  const { api } = useTenant();
  const { t } = useT();
  const report = useQuery({ queryKey: ["report-occupancy"], queryFn: () => api.occupancyReport() });
  const r = report.data;
  const count = (key: keyof OccupancyRow, label: string) => ({
    title: label, key, align: "right" as const, render: (_: unknown, row: OccupancyRow) => row[key] as number,
  });
  const columns: TableProps<OccupancyRow>["columns"] = [
    { title: t("reports.property"), key: "name", render: (_, row) => row.propertyName ?? <strong>{t("reports.total")}</strong> },
    count("total", t("reports.apartments")), count("occupied", t("reports.occupied")), count("reserved", t("reports.reserved")),
    count("available", t("reports.available")), count("maintenance", t("reports.maintenance")),
    {
      title: t("reports.occupancy"), key: "rate", width: 170,
      render: (_, row) => <Progress percent={Math.round(row.occupancyRate * 100)} size="small" format={() => formatPercent(row.occupancyRate)} />,
    },
    { title: t("reports.rentRoll"), key: "roll", align: "right", render: (_, row) => formatMoney(row.rentRoll) },
    { title: t("reports.potential"), key: "potential", align: "right", render: (_, row) => formatMoney(row.potentialRent) },
  ];
  const exportCsv = () => r && downloadCsv(`occupancy-${dayjs().format("YYYY-MM-DD")}.csv`,
    [t("reports.property"), t("reports.apartments"), t("reports.occupied"), t("reports.reserved"), t("reports.available"),
      t("reports.maintenance"), t("reports.inactive"), t("reports.occupancy"), t("reports.rentRoll"), t("reports.potential")],
    [...r.properties, r.totals].map((row) => [row.propertyName ?? t("reports.total"), row.total, row.occupied, row.reserved,
      row.available, row.maintenance, row.inactive, formatPercent(row.occupancyRate), row.rentRoll, row.potentialRent]));

  return (
    <>
      <Toolbar onExport={exportCsv} printHref="/print/report/occupancy" />
      {report.error && <Alert type="error" showIcon title={errorMessage(report.error)} />}
      {report.isPending && <Skeleton active />}
      {r && (
        <>
          <Flex gap={10} wrap style={{ marginBottom: 16 }}>
            <Tile label={t("reports.occupancy")} value={formatPercent(r.totals.occupancyRate)} />
            <Tile label={t("reports.available")} value={String(r.totals.available)} />
            <Tile label={t("reports.rentRoll")} value={formatMoney(r.totals.rentRoll)} />
            <Tile label={t("reports.potential")} value={formatMoney(r.totals.potentialRent)} />
          </Flex>
          <ResponsiveTable<OccupancyRow> rowKey={(row) => row.propertyId ?? "total"} size="middle" columns={columns}
            dataSource={[...r.properties, r.totals]} pagination={false} scroll={{ x: 900 }} />
        </>
      )}
    </>
  );
}

function ReportsPage() {
  const { t } = useT();
  const url = useUrlState();
  const { canReadReports } = usePortfolioPermissions();
  if (!canReadReports) {
    return <Result status="403" title={t("gate.noAccess")} />;
  }
  const tab = url.get("tab") ?? "income";
  return (
    <>
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <Card>
        <Tabs activeKey={tab} onChange={(key) => url.set({ tab: key === "income" ? undefined : key, from: undefined, to: undefined })}
          destroyOnHidden items={[
            { key: "income", label: t("reports.tabIncome"), children: <IncomeTab /> },
            { key: "arrears", label: t("reports.tabArrears"), children: <ArrearsTab /> },
            { key: "occupancy", label: t("reports.tabOccupancy"), children: <OccupancyTab /> },
          ]} />
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ReportsPage />
    </Suspense>
  );
}
