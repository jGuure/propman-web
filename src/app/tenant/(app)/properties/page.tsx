"use client";

import { AppstoreOutlined, BarsOutlined, HomeOutlined, PlusOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AutoComplete, Button, Card, Col, Empty, Flex, Image, Input, Pagination, Progress, Row, Segmented, Select, Space, Typography, type TableProps } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { FilterPanel } from "@/components/FilterPanel";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { PropertyFormDrawer } from "@/components/portfolio/PropertyFormDrawer";
import { PropertyStatusTag } from "@/components/portfolio/tags";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { PropertyListParams, PropertyStatus, PropertySummary, PropertyType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatPercent } from "@/lib/format";
import { PROPERTY_STATUSES, PROPERTY_TYPES, SOMALI_CITIES, useLabels } from "@/lib/labels";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

const SORTABLE = new Set(["name", "code", "city", "type", "status", "createdAt"]);

function PropertiesPage() {
  const { api } = useTenant();
  const router = useRouter();
  const url = useUrlState();
  const { t, tn } = useT();
  const labels = useLabels();
  const { canManage } = usePortfolioPermissions();
  const [addOpen, setAddOpen] = useState(url.get("add") === "1");
  const openedFromLink = url.get("add") === "1";

  // "?add=1" (e.g. from the dashboard) opens the drawer once; drop it so closing or saving does not reopen it
  useEffect(() => {
    if (openedFromLink) {
      url.set({ add: undefined });
    }
  }, [openedFromLink, url]);
  const view = url.get("view") === "cards" ? "cards" : "table";
  const params: PropertyListParams = {
    search: url.get("search"),
    type: url.get("type") as PropertyType | undefined,
    status: url.get("status") as PropertyStatus | undefined,
    city: url.get("city"),
    page: url.getNumber("page") ?? 0,
    size: url.getNumber("size") ?? (view === "cards" ? 12 : 20),
    sort: url.get("sort") ?? "name,asc",
  };
  const properties = useQuery({
    queryKey: ["properties", params],
    queryFn: () => api.properties(params),
    placeholderData: keepPreviousData,
  });
  const hasFilters = !!(params.search || params.type || params.status || params.city);
  const open = (id: string) => router.push(`/properties/${id}`);

  const [sortField, sortDir] = (params.sort ?? "").split(",");
  const columns: TableProps<PropertySummary>["columns"] = [
    {
      title: t("properties.property"), key: "name", sorter: true, sortOrder: sortField === "name" ? (sortDir === "desc" ? "descend" : "ascend") : null,
      render: (_, p) => (
        <Flex vertical>
          <Link href={`/properties/${p.id}`}><Typography.Text strong>{p.name}</Typography.Text></Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.code}</Typography.Text>
        </Flex>
      ),
    },
    { title: t("common.type"), dataIndex: "type", key: "type", render: (type: PropertyType) => labels.propertyType(type) },
    {
      title: t("properties.location"), key: "city", sorter: true, sortOrder: sortField === "city" ? (sortDir === "desc" ? "descend" : "ascend") : null,
      render: (_, p) => [p.district, p.city].filter(Boolean).join(", "),
    },
    { title: t("properties.apartments"), key: "units", align: "right", render: (_, p) => p.unitStats.total },
    { title: t("properties.available"), key: "vacant", align: "right", render: (_, p) => p.unitStats.vacant },
    {
      title: t("properties.occupancy"), key: "occupancy", width: 160,
      render: (_, p) => <Progress percent={Math.round(p.unitStats.occupancyRate * 100)} size="small" />,
    },
    { title: t("common.status"), dataIndex: "status", key: "status", render: (s: PropertyStatus) => <PropertyStatusTag status={s} /> },
  ];

  const content = properties.data?.content ?? [];
  const empty = (
    <Empty image={<HomeOutlined style={{ fontSize: 48, color: "#0f766e" }} />}
      description={hasFilters ? t("properties.noMatch") : t("properties.empty")}>
      {!hasFilters && canManage && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>{t("properties.addFirst")}</Button>
      )}
    </Empty>
  );

  return (
    <>
      <PageHeader title={t("properties.title")} description={t("properties.subtitle")}
        extra={canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>{t("properties.add")}</Button>} />
      <Card style={{ marginBottom: 16 }}>
        <Flex gap={12} wrap justify="space-between">
          <Space wrap>
            <Input.Search key={params.search ?? ""} placeholder={t("properties.searchPlaceholder")} allowClear style={{ width: 240 }}
              defaultValue={params.search} onSearch={(search) => url.set({ search })} />
            <FilterPanel active={[params.type, params.status, params.city].filter(Boolean).length}>
<Select allowClear placeholder={t("common.type")} style={{ width: 150 }} value={params.type}
              onChange={(type) => url.set({ type })}
              options={PROPERTY_TYPES.map((type) => ({ value: type, label: labels.propertyType(type) }))} />
            <Select allowClear placeholder={t("common.status")} style={{ width: 150 }} value={params.status}
              onChange={(status) => url.set({ status })}
              options={PROPERTY_STATUSES.map((s) => ({ value: s, label: labels.propertyStatus(s) }))} />
            <AutoComplete key={params.city ?? ""} allowClear placeholder={t("common.city")} style={{ width: 160 }} defaultValue={params.city}
              options={SOMALI_CITIES.map((c) => ({ value: c }))} onSelect={(city?: string) => url.set({ city })}
              onChange={(v?: string) => { if (!v) url.set({ city: undefined }); }}
              onBlur={(e) => url.set({ city: (e.target as HTMLInputElement).value || undefined })} />
          </FilterPanel>
          </Space>
          <Segmented value={view} onChange={(v) => url.set({ view: v === "cards" ? "cards" : undefined, size: undefined })}
            options={[{ value: "table", icon: <BarsOutlined />, label: t("properties.table") }, { value: "cards", icon: <AppstoreOutlined />, label: t("properties.cards") }]} />
        </Flex>
      </Card>
      {view === "table" ? (
        <Card>
          <ResponsiveTable<PropertySummary> rowKey="id" columns={columns} dataSource={content} loading={properties.isFetching}
            scroll={{ x: 800 }} onRow={(p) => ({ onDoubleClick: () => open(p.id) })}
            locale={{ emptyText: properties.error ? errorMessage(properties.error) : empty }}
            onChange={(pagination, _f, sorter) => {
              const single = Array.isArray(sorter) ? sorter[0] : sorter;
              const key = single?.columnKey ? String(single.columnKey) : undefined;
              url.set({
                page: (pagination.current ?? 1) - 1 || undefined,
                size: pagination.pageSize !== 20 ? pagination.pageSize : undefined,
                sort: key && SORTABLE.has(key) && single.order ? `${key},${single.order === "ascend" ? "asc" : "desc"}` : undefined,
              });
            }}
            pagination={{
              current: params.page + 1, pageSize: params.size, total: properties.data?.totalElements ?? 0,
              showSizeChanger: true, showTotal: (total) => tn("count.properties", total),
            }} />
        </Card>
      ) : (
        <>
          {content.length === 0 && !properties.isFetching && <Card>{empty}</Card>}
          <Row gutter={[16, 16]}>
            {content.map((p) => (
              <Col key={p.id} xs={24} sm={12} lg={8} xl={6}>
                <Card hoverable onClick={() => open(p.id)} cover={p.coverPhotoUrl
                  ? <Image src={p.coverPhotoUrl} alt={p.name} height={150} preview={false} style={{ objectFit: "cover" }} />
                  : <Flex align="center" justify="center" style={{ height: 150, background: "#e6f4f1" }}>
                    <HomeOutlined style={{ fontSize: 40, color: "#0f766e" }} />
                  </Flex>}>
                  <Flex justify="space-between" align="start" gap={8}>
                    <div>
                      <Typography.Text strong>{p.name}</Typography.Text>
                      <div><Typography.Text type="secondary" style={{ fontSize: 13 }}>{p.city} · {tn("count.apartments", p.unitStats.total)}</Typography.Text></div>
                    </div>
                    <PropertyStatusTag status={p.status} />
                  </Flex>
                  <Progress percent={Math.round(p.unitStats.occupancyRate * 100)} size="small"
                    format={() => formatPercent(p.unitStats.occupancyRate)} style={{ marginTop: 12, marginBottom: 0 }} />
                </Card>
              </Col>
            ))}
          </Row>
          {(properties.data?.totalElements ?? 0) > params.size && (
            <Flex justify="end" style={{ marginTop: 16 }}>
              <Pagination current={params.page + 1} pageSize={params.size} total={properties.data?.totalElements}
                onChange={(page) => url.set({ page: page - 1 || undefined })} />
            </Flex>
          )}
        </>
      )}
      <PropertyFormDrawer open={addOpen} onClose={() => setAddOpen(false)}
        onSaved={(p) => router.push(`/properties/${p.id}`)} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PropertiesPage />
    </Suspense>
  );
}
