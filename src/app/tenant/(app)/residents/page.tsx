"use client";

import { PhoneOutlined, UserAddOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, Flex, Grid, Input, Result, Segmented, Select, Table, Tag, Typography, type TableProps } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ResidentFormModal } from "@/components/leases/ResidentFormModal";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { ResidentSummary, Tenancy } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

type Filter = "all" | Tenancy | "archived";

function ResidentsPage() {
  const { api } = useTenant();
  const { t, tn } = useT();
  const router = useRouter();
  const url = useUrlState();
  const screens = Grid.useBreakpoint();
  const { canReadResidents, canManageResidents } = usePortfolioPermissions();
  const [addOpen, setAddOpen] = useState(false);
  const filter = (url.get("filter") ?? "all") as Filter;
  const params = {
    search: url.get("search"),
    tenancy: filter === "CURRENT" || filter === "FORMER" || filter === "NONE" ? filter : undefined,
    archived: filter === "archived" ? true : undefined,
    page: url.getNumber("page") ?? 0,
    size: url.getNumber("size") ?? 20,
    sort: "fullName,asc",
  };
  const residents = useQuery({
    queryKey: ["residents", params],
    queryFn: () => api.residents(params),
    placeholderData: keepPreviousData,
    enabled: canReadResidents,
  });

  if (!canReadResidents) {
    return <Result status="403" title={t("gate.noAccess")} />;
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: t("residents.all") },
    { value: "CURRENT", label: t("residents.tenancyCurrent") },
    { value: "FORMER", label: t("residents.tenancyFormer") },
    { value: "NONE", label: t("residents.tenancyNone") },
    { value: "archived", label: t("residents.archived") },
  ];
  const columns: TableProps<ResidentSummary>["columns"] = [
    {
      title: t("residents.name"), key: "name",
      render: (_, r) => (
        <Flex vertical>
          <Link href={`/residents/${r.id}`}><Typography.Text strong>{r.fullName}</Typography.Text></Link>
          {r.idNumber && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t(`idType.${r.idType ?? "OTHER"}`)} {r.idNumber}</Typography.Text>}
        </Flex>
      ),
    },
    {
      title: t("residents.phone"), key: "phone",
      render: (_, r) => <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}><PhoneOutlined /> {r.phone}</a>,
    },
    {
      title: t("residents.leases"), key: "leases", align: "right",
      render: (_, r) => (r.openLeases > 0 ? <Tag color="blue">{tn("residents.activeLeases", r.openLeases)}</Tag> : "—"),
    },
  ];

  return (
    <>
      <PageHeader title={t("residents.title")} description={t("residents.subtitle")}
        extra={canManageResidents && (
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAddOpen(true)}>{t("residents.add")}</Button>
        )} />
      <Card>
        <Flex gap={12} wrap justify="space-between" style={{ marginBottom: 16 }}>
          <Input.Search key={params.search ?? ""} defaultValue={params.search} allowClear style={{ maxWidth: 320 }}
            placeholder={t("residents.searchPlaceholder")} onSearch={(search) => url.set({ search })} />
          {screens.md ? (
            <Segmented value={filter} options={filters} onChange={(v) => url.set({ filter: v === "all" ? undefined : String(v) })} />
          ) : (
            <Select value={filter} options={filters} style={{ minWidth: 180 }}
              onChange={(v) => url.set({ filter: v === "all" ? undefined : v })} />
          )}
        </Flex>
        <Table<ResidentSummary> rowKey="id" columns={columns} dataSource={residents.data?.content}
          loading={residents.isFetching} scroll={{ x: 520 }}
          onRow={(r) => ({ onDoubleClick: () => router.push(`/residents/${r.id}`) })}
          locale={{
            emptyText: residents.error ? errorMessage(residents.error) : (
              <Empty description={params.search || filter !== "all" ? t("residents.noMatch") : t("residents.empty")} />
            ),
          }}
          onChange={(p) => url.set({
            page: (p.current ?? 1) - 1 || undefined,
            size: p.pageSize && p.pageSize !== 20 ? p.pageSize : undefined,
          })}
          pagination={{
            current: params.page + 1, pageSize: params.size, total: residents.data?.totalElements ?? 0,
            showSizeChanger: true,
          }} />
      </Card>
      <ResidentFormModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={(r) => router.push(`/residents/${r.id}`)} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ResidentsPage />
    </Suspense>
  );
}
