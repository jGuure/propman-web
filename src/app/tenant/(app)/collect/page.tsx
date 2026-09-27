"use client";

import { DollarOutlined, MoreOutlined, PhoneOutlined } from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Col, DatePicker, Dropdown, Empty, Flex, Grid, Input, Progress, Result, Row, Segmented, Select, Table, Tooltip, Typography, type MenuProps, type TableProps } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AccountDrawer } from "@/components/payments/AccountDrawer";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { ChargeStatusTag } from "@/components/payments/tags";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Charge, ChargeStatus } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatMoney } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

type Filter = "all" | "check" | ChargeStatus;

function CollectPage() {
  const { api } = useTenant();
  const { t } = useT();
  const url = useUrlState();
  const screens = Grid.useBreakpoint();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canReadPayments, canManagePayments } = usePortfolioPermissions();
  const [paying, setPaying] = useState<{ charge: Charge; quick: boolean }>();
  const [account, setAccount] = useState<Charge>();

  const month = url.get("month") ?? dayjs().format("YYYY-MM");
  const period = `${month}-01`;
  const filter = (url.get("filter") ?? "all") as Filter;
  const propertyId = url.get("propertyId");
  const params = {
    period,
    propertyId,
    search: url.get("search"),
    needsCheck: filter === "check" ? true : undefined,
    status: filter !== "all" && filter !== "check" ? [filter] : undefined,
    page: url.getNumber("page") ?? 0,
    size: 50,
    sort: "dueDate,asc",
  };
  const charges = useQuery({
    queryKey: ["charges", params], queryFn: () => api.charges(params), placeholderData: keepPreviousData,
    enabled: canReadPayments,
  });
  const summary = useQuery({
    queryKey: ["collection-summary", period, propertyId], queryFn: () => api.collectionSummary(period, propertyId),
    enabled: canReadPayments,
  });
  const properties = useQuery({
    queryKey: ["properties", "options"], queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }),
    enabled: canReadPayments,
  });
  const mark = useMutation({
    mutationFn: ({ charge, unpaid }: { charge: Charge; unpaid: boolean }) =>
      unpaid ? api.markUnpaid(charge.id) : api.clearUnpaidMark(charge.id),
    onSuccess: (_, { unpaid }) => {
      message.success(t(unpaid ? "collect.markedUnpaid" : "collect.markCleared"));
      invalidatePortfolio(queryClient);
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (!canReadPayments) {
    return <Result status="403" title={t("gate.noAccess")} />;
  }

  const s = summary.data;
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("collect.filterAll") },
    { value: "check", label: `${t("collect.filterCheck")}${s?.needsCheck ? ` (${s.needsCheck})` : ""}` },
    { value: "OVERDUE", label: t("chargeStatus.OVERDUE") },
    { value: "PARTLY_PAID", label: t("chargeStatus.PARTLY_PAID") },
    { value: "DUE", label: t("chargeStatus.DUE") },
    { value: "PAID", label: t("chargeStatus.PAID") },
  ];

  const actions = (c: Charge): MenuProps["items"] => [
    { key: "other", label: t("collect.otherAmount"), onClick: () => setPaying({ charge: c, quick: false }) },
    ...(c.status === "UNCONFIRMED" || c.status === "PARTLY_PAID"
      ? [{ key: "unpaid", danger: true, label: t("collect.markUnpaid"), onClick: () => mark.mutate({ charge: c, unpaid: true }) }] : []),
    ...(c.status === "OVERDUE"
      ? [{ key: "clear", label: t("collect.clearMark"), onClick: () => mark.mutate({ charge: c, unpaid: false }) }] : []),
    { key: "account", label: t("collect.viewAccount"), onClick: () => setAccount(c) },
  ];

  const columns: TableProps<Charge>["columns"] = [
    {
      title: t("collect.resident"), key: "resident",
      render: (_, c) => (
        <Flex vertical>
          <Link href={`/residents/${c.lease.residentId}`}><Typography.Text strong>{c.lease.residentName}</Typography.Text></Link>
          <a href={`tel:${c.lease.residentPhone.replace(/[^+\d]/g, "")}`} style={{ fontSize: 12 }}><PhoneOutlined /> {c.lease.residentPhone}</a>
        </Flex>
      ),
    },
    {
      title: t("collect.apartment"), key: "unit",
      render: (_, c) => (
        <Flex vertical>
          <Link href={`/units/${c.lease.unitId}`}>{c.lease.unitNumber}{c.lease.roomName ? ` · ${c.lease.roomName}` : ""}</Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.lease.propertyName}{c.lease.buildingName ? ` · ${c.lease.buildingName}` : ""}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: t("collect.dueDate"), key: "due", render: (_, c) => formatDate(c.dueDate) },
    { title: t("collect.amount"), key: "amount", align: "right", render: (_, c) => formatMoney(c.amount) },
    {
      title: t("collect.remaining"), key: "left", align: "right",
      render: (_, c) => (c.remaining > 0 && c.status !== "VOID"
        ? <Typography.Text strong type={c.status === "OVERDUE" ? "danger" : undefined}>{formatMoney(c.remaining)}</Typography.Text>
        : "—"),
    },
    { title: t("collect.status"), key: "status", render: (_, c) => <ChargeStatusTag status={c.status} /> },
    {
      key: "actions", align: "right", width: 150,
      render: (_, c) => (
        <Flex gap={4} justify="end">
          {canManagePayments && c.remaining > 0 && c.status !== "VOID" && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => setPaying({ charge: c, quick: true })}>
              {t("collect.markPaid")}
            </Button>
          )}
          <Dropdown trigger={["click"]} menu={{ items: canManagePayments ? actions(c) : actions(c)!.filter((i) => i?.key === "account") }}>
            <Button size="small" icon={<MoreOutlined />} aria-label={t("common.actions")} />
          </Dropdown>
        </Flex>
      ),
    },
  ];

  const tile = (label: string, value: string, extra?: React.ReactNode, help?: string) => (
    <Card size="small" style={{ height: "100%" }}>
      <Tooltip title={help}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>{label}</Typography.Text>
      </Tooltip>
      <div style={{ fontWeight: 600, fontSize: 22 }}>{value}</div>
      {extra}
    </Card>
  );

  return (
    <>
      <PageHeader title={t("collect.title")} description={t("collect.subtitle")}
        extra={
          <Flex gap={8} wrap>
            <DatePicker picker="month" allowClear={false} value={dayjs(period)} format="MMMM YYYY"
              onChange={(d) => url.set({ month: d ? d.format("YYYY-MM") : undefined })} />
            <Select allowClear placeholder={t("apartments.property")} style={{ width: 200 }} value={propertyId}
              showSearch={{ optionFilterProp: "label" }} onChange={(v) => url.set({ propertyId: v })}
              options={(properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          </Flex>
        } />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>{tile(t("collect.expected"), formatMoney(s?.expected ?? 0))}</Col>
        <Col xs={12} lg={6}>{tile(t("collect.collected"), formatMoney(s?.collected ?? 0),
          <Progress percent={s && s.expected > 0 ? Math.round((s.collected / s.expected) * 100) : 0} size="small" style={{ margin: 0 }} />)}</Col>
        <Col xs={12} lg={6}>{tile(t("collect.outstanding"), formatMoney(s?.outstanding ?? 0))}</Col>
        <Col xs={12} lg={6}>{tile(t("collect.toCheck"), String(s?.needsCheck ?? 0),
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("collect.received")}: {formatMoney(s?.received ?? 0)}
          </Typography.Text>, t("collect.toCheckHelp"))}</Col>
      </Row>
      <Card>
        <Flex gap={12} wrap justify="space-between" style={{ marginBottom: 16 }}>
          <Input.Search key={params.search ?? ""} defaultValue={params.search} allowClear style={{ maxWidth: 280 }}
            placeholder={t("collect.searchPlaceholder")} onSearch={(search) => url.set({ search })} />
          {screens.lg ? (
            <Segmented value={filter} options={filters} onChange={(v) => url.set({ filter: v === "all" ? undefined : String(v) })} />
          ) : (
            <Select value={filter} options={filters} style={{ minWidth: 180 }}
              onChange={(v) => url.set({ filter: v === "all" ? undefined : v })} />
          )}
        </Flex>
        {filter === "check" && (s?.needsCheck ?? 0) > 0 && (
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t("collect.toCheckHelp")}</Typography.Paragraph>
        )}
        <Table<Charge> rowKey="id" columns={columns} dataSource={charges.data?.content} loading={charges.isFetching}
          scroll={{ x: 900 }} size="middle"
          locale={{
            emptyText: charges.error ? errorMessage(charges.error) : (
              <Empty description={filter !== "all" || params.search || propertyId ? t("collect.noMatch")
                : <>{t("collect.empty")}<br /><Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("collect.emptyHelp")}</Typography.Text></>} />
            ),
          }}
          onChange={(p) => url.set({ page: (p.current ?? 1) - 1 || undefined })}
          pagination={{ current: params.page + 1, pageSize: params.size, total: charges.data?.totalElements ?? 0, hideOnSinglePage: true }} />
      </Card>
      {paying && (
        <PaymentModal open charge={paying.quick ? paying.charge : undefined} onClose={() => setPaying(undefined)}
          target={{
            leaseId: paying.charge.leaseId, residentName: paying.charge.lease.residentName,
            monthlyRent: paying.charge.lease.monthlyRent, owed: paying.charge.remaining,
          }} />
      )}
      {account && (
        <AccountDrawer open leaseId={account.leaseId} residentName={account.lease.residentName}
          monthlyRent={account.lease.monthlyRent} onClose={() => setAccount(undefined)} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <CollectPage />
    </Suspense>
  );
}
