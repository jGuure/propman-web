"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card, Empty, Flex, Grid, Input, Result, Segmented, Select, Table, Typography, type TableProps } from "antd";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DepositTag, EndingSoonTag, LeaseStatusTag } from "@/components/leases/tags";
import { usePeriod } from "@/components/leases/LeaseCard";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Lease, LeaseStatus } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatMoney } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

type Filter = "open" | LeaseStatus | "all";

const STATUSES: Record<Filter, LeaseStatus[] | undefined> = {
  open: ["UPCOMING", "ACTIVE"],
  UPCOMING: ["UPCOMING"],
  ACTIVE: ["ACTIVE"],
  ENDED: ["ENDED"],
  CANCELLED: ["CANCELLED"],
  all: undefined,
};

function LeasesPage() {
  const { api } = useTenant();
  const { t } = useT();
  const url = useUrlState();
  const screens = Grid.useBreakpoint();
  const period = usePeriod();
  const { canReadLeases } = usePortfolioPermissions();
  const filter = (url.get("filter") ?? "open") as Filter;
  const params = {
    status: STATUSES[filter],
    propertyId: url.get("propertyId"),
    search: url.get("search"),
    page: url.getNumber("page") ?? 0,
    size: url.getNumber("size") ?? 20,
    sort: "startDate,desc",
  };
  const leases = useQuery({
    queryKey: ["leases", params],
    queryFn: () => api.leases(params),
    placeholderData: keepPreviousData,
    enabled: canReadLeases,
  });
  const properties = useQuery({
    queryKey: ["properties", "options"],
    queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }),
    enabled: canReadLeases,
  });

  if (!canReadLeases) {
    return <Result status="403" title={t("gate.noAccess")} />;
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "open", label: t("leases.open") },
    { value: "ACTIVE", label: t("leaseStatus.ACTIVE") },
    { value: "UPCOMING", label: t("leaseStatus.UPCOMING") },
    { value: "ENDED", label: t("leaseStatus.ENDED") },
    { value: "CANCELLED", label: t("leaseStatus.CANCELLED") },
    { value: "all", label: t("leases.all") },
  ];
  const columns: TableProps<Lease>["columns"] = [
    {
      title: t("leases.resident"), key: "resident",
      render: (_, l) => (
        <Flex vertical>
          <Link href={`/residents/${l.resident.id}`}><Typography.Text strong>{l.resident.fullName}</Typography.Text></Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{l.resident.phone}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t("leases.apartment"), key: "unit",
      render: (_, l) => (
        <Flex vertical>
          <Link href={`/units/${l.unit.id}`}>{l.unit.unitNumber}{l.room ? ` · ${l.room.name}` : ""}</Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {l.unit.propertyName}{l.unit.buildingName ? ` · ${l.unit.buildingName}` : ""}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: t("leases.period"), key: "period", render: (_, l) => <span style={{ fontSize: 13 }}>{period(l)}</span> },
    { title: t("leases.rent"), key: "rent", align: "right", render: (_, l) => formatMoney(l.monthlyRent) },
    { title: t("leases.deposit"), key: "deposit", render: (_, l) => <DepositTag status={l.deposit.status} /> },
    {
      title: t("leases.status"), key: "status",
      render: (_, l) => <Flex gap={4} wrap><LeaseStatusTag status={l.status} />{l.endingSoon && <EndingSoonTag />}</Flex>,
    },
  ];

  return (
    <>
      <PageHeader title={t("leases.title")} description={t("leases.subtitle")} />
      <Card>
        <Flex gap={12} wrap justify="space-between" style={{ marginBottom: 16 }}>
          <Flex gap={12} wrap>
            <Input.Search key={params.search ?? ""} defaultValue={params.search} allowClear style={{ width: 260 }}
              placeholder={t("leases.searchPlaceholder")} onSearch={(search) => url.set({ search })} />
            <Select allowClear placeholder={t("apartments.property")} style={{ width: 200 }} value={params.propertyId}
              showSearch={{ optionFilterProp: "label" }} onChange={(v) => url.set({ propertyId: v })}
              options={(properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          </Flex>
          {screens.lg ? (
            <Segmented value={filter} options={filters} onChange={(v) => url.set({ filter: v === "open" ? undefined : String(v) })} />
          ) : (
            <Select value={filter} options={filters} style={{ minWidth: 160 }}
              onChange={(v) => url.set({ filter: v === "open" ? undefined : v })} />
          )}
        </Flex>
        <Table<Lease> rowKey="id" columns={columns} dataSource={leases.data?.content} loading={leases.isFetching}
          scroll={{ x: 820 }}
          locale={{
            emptyText: leases.error ? errorMessage(leases.error) : (
              <Empty description={params.search || params.propertyId || filter !== "open" ? t("leases.noMatch") : t("leases.empty")} />
            ),
          }}
          onChange={(p) => url.set({
            page: (p.current ?? 1) - 1 || undefined,
            size: p.pageSize && p.pageSize !== 20 ? p.pageSize : undefined,
          })}
          pagination={{ current: params.page + 1, pageSize: params.size, total: leases.data?.totalElements ?? 0, showSizeChanger: true }} />
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LeasesPage />
    </Suspense>
  );
}
