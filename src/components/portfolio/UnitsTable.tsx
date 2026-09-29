"use client";

import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Col, Dropdown, Empty, Flex, Input, InputNumber, Row, Select, Space, Typography, type MenuProps, type TableProps } from "antd";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { FilterPanel } from "@/components/FilterPanel";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { errorMessage } from "@/lib/api/errors";
import type { UnitListParams, UnitStatus, UnitSummary, UnitType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatMoney } from "@/lib/format";
import { UNIT_STATUSES, UNIT_TYPES, useLabels } from "@/lib/labels";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";
import { ChangeStatusModal } from "./ChangeStatusModal";
import { invalidatePortfolio } from "./invalidate";
import { UnitStatusTag } from "./tags";

interface Props {
  /** Restrict to one property (property page); hides the property filter. */
  propertyId?: string;
  onOpenUnit: (unitId: string) => void;
  onAddUnit?: () => void;
}

const SORTABLE = new Set(["unitNumber", "floor", "baseRent", "status", "type", "bedrooms", "sizeSqm"]);

/** Units table with URL-synced filters, used by the Units page and the property page. */
export function UnitsTable({ propertyId, onOpenUnit, onAddUnit }: Props) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const labels = useLabels();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManage, canChangeStatus } = usePortfolioPermissions();
  const url = useUrlState();
  const [statusUnit, setStatusUnit] = useState<UnitSummary | undefined>();

  const params: UnitListParams = {
    propertyId: propertyId ?? url.get("propertyId"),
    buildingId: url.get("buildingId"),
    status: url.get("status") as UnitStatus | undefined,
    type: url.get("type") as UnitType | undefined,
    bedrooms: url.getNumber("bedrooms"),
    floor: url.getNumber("floor"),
    furnished: url.getBoolean("furnished"),
    minRent: url.getNumber("minRent"),
    maxRent: url.getNumber("maxRent"),
    search: url.get("search"),
    archived: url.getBoolean("archived"),
    page: url.getNumber("page") ?? 0,
    size: url.getNumber("size") ?? 20,
    sort: url.get("sort") ?? "unitNumber,asc",
  };
  const units = useQuery({
    queryKey: ["units", params],
    queryFn: () => api.units(params),
    placeholderData: keepPreviousData,
  });
  const properties = useQuery({
    queryKey: ["properties", "options"],
    queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }),
    enabled: !propertyId,
  });
  const buildings = useQuery({
    queryKey: ["buildings", params.propertyId],
    queryFn: () => api.buildings(params.propertyId!),
    enabled: !!params.propertyId,
  });

  const archive = useMutation({
    mutationFn: (unit: UnitSummary) => (unit.archived ? api.restoreUnit(unit.id) : api.archiveUnit(unit.id)),
    onSuccess: (unit) => {
      message.success(t(unit.archivedAt ? "apartments.archivedMsg" : "apartments.restoredMsg", { number: unit.unitNumber }));
      invalidatePortfolio(queryClient);
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const actions = (unit: UnitSummary): MenuProps["items"] => {
    const items: MenuProps["items"] = [{ key: "open", label: t("common.open"), onClick: () => onOpenUnit(unit.id) }];
    if (canChangeStatus && !unit.archived) {
      items.push({ key: "status", label: t("explorer.changeStatus"), onClick: () => setStatusUnit(unit) });
    }
    if (canManage) {
      items.push(unit.archived
        ? { key: "restore", label: t("common.restore"), onClick: () => archive.mutate(unit) }
        : {
          key: "archive", label: t("common.archive"), danger: true, disabled: unit.status === "OCCUPIED" || unit.status === "RESERVED",
          onClick: () => modal.confirm({
            title: t("apartments.archiveTitle", { number: unit.unitNumber }),
            content: t("apartments.archiveText"),
            okText: t("common.archive"), okButtonProps: { danger: true }, onOk: () => archive.mutateAsync(unit),
          }),
        });
    }
    return items;
  };

  const columns: TableProps<UnitSummary>["columns"] = [
    {
      title: t("apartments.apartment"), dataIndex: "unitNumber", key: "unitNumber", sorter: true, fixed: "left", width: 110,
      render: (number: string, unit) => <Typography.Link strong onClick={() => onOpenUnit(unit.id)}>{number}</Typography.Link>,
    },
    ...(propertyId ? [] : [{
      title: t("apartments.property"), key: "property",
      render: (_: unknown, unit: UnitSummary) => unit.propertyName,
    }]),
    { title: t("apartments.flat"), key: "building", render: (_, unit) => unit.buildingName ?? "—" },
    { title: t("apartments.rooms"), key: "rooms", align: "right", render: (_, unit) => unit.roomCount || "—" },
    { title: t("apartments.floor"), dataIndex: "floor", key: "floor", sorter: true, render: (floor: number) => labels.floor(floor) },
    { title: t("common.type"), dataIndex: "type", key: "type", sorter: true, render: (type: UnitType) => labels.unitType(type) },
    { title: t("apartments.bedsBaths"), key: "bedrooms", sorter: true, render: (_, u) => `${u.bedrooms} / ${u.bathrooms}` },
    { title: t("common.size"), dataIndex: "sizeSqm", key: "sizeSqm", sorter: true, render: (s: number | null) => (s ? `${s} m²` : "—") },
    {
      title: t("common.rent"), dataIndex: "baseRent", key: "baseRent", sorter: true, align: "right",
      render: (rent: number) => formatMoney(rent),
    },
    {
      title: t("common.status"), dataIndex: "status", key: "status", sorter: true,
      render: (status: UnitStatus, unit) => (unit.archived ? <Typography.Text type="secondary">{t("common.archived")}</Typography.Text>
        : <UnitStatusTag status={status} />),
    },
    {
      key: "actions", width: 56, align: "right", fixed: "right",
      render: (_, unit) => (
        <Dropdown menu={{ items: actions(unit) }} trigger={["click"]}>
          <Button type="text" icon={<MoreOutlined />} aria-label={t("apartments.actionsFor", { number: unit.unitNumber })} />
        </Dropdown>
      ),
    },
  ];

  const sortOrder = (key: string) => {
    const [field, dir] = (params.sort ?? "").split(",");
    return field === key ? (dir === "desc" ? "descend" as const : "ascend" as const) : null;
  };
  columns.forEach((c) => {
    if (c && "key" in c && typeof c.key === "string" && SORTABLE.has(c.key)) {
      (c as { sortOrder?: "ascend" | "descend" | null }).sortOrder = sortOrder(c.key);
    }
  });

  const onChange: TableProps<UnitSummary>["onChange"] = (pagination, _filters, sorter) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = single?.columnKey ? String(single.columnKey) : undefined;
    url.set({
      page: (pagination.current ?? 1) - 1 || undefined,
      size: pagination.pageSize && pagination.pageSize !== 20 ? pagination.pageSize : undefined,
      sort: key && SORTABLE.has(key) && single.order ? `${key},${single.order === "ascend" ? "asc" : "desc"}` : undefined,
    });
  };

  const hasFilters = ["buildingId", "status", "type", "bedrooms", "floor", "furnished", "minRent", "maxRent", "search",
    "archived"].some((k) => url.get(k) !== undefined) || (!propertyId && url.get("propertyId") !== undefined);

  const activeFilters = ["buildingId", "status", "type", "bedrooms", "furnished", "minRent", "maxRent", "archived"]
    .filter((k) => url.get(k) !== undefined).length + (!propertyId && url.get("propertyId") !== undefined ? 1 : 0);

  return (
    <Card>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8} lg={6}>
          <Input.Search key={params.search ?? ""} placeholder={t("apartments.searchPlaceholder")} allowClear
            defaultValue={params.search}
            onSearch={(search) => url.set({ search })} />
        </Col>
        <FilterPanel layout="row" active={activeFilters}>
        {!propertyId && (
          <Col xs={12} md={8} lg={4}>
            <Select allowClear placeholder={t("apartments.property")} style={{ width: "100%" }} value={params.propertyId}
              showSearch={{ optionFilterProp: "label" }}
              onChange={(v) => url.set({ propertyId: v, buildingId: undefined })}
              options={(properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          </Col>
        )}
        {params.propertyId && (buildings.data?.length ?? 0) > 0 && (
          <Col xs={12} md={8} lg={4}>
            <Select allowClear placeholder={t("apartments.flat")} style={{ width: "100%" }} value={params.buildingId}
              onChange={(v) => url.set({ buildingId: v })}
              options={(buildings.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
          </Col>
        )}
        <Col xs={12} md={8} lg={3}>
          <Select allowClear placeholder={t("common.status")} style={{ width: "100%" }} value={params.status}
            onChange={(v) => url.set({ status: v })}
            options={UNIT_STATUSES.map((s) => ({ value: s, label: labels.unitStatus(s) }))} />
        </Col>
        <Col xs={12} md={8} lg={3}>
          <Select allowClear placeholder={t("common.type")} style={{ width: "100%" }} value={params.type}
            onChange={(v) => url.set({ type: v })}
            options={UNIT_TYPES.map((type) => ({ value: type, label: labels.unitType(type) }))} />
        </Col>
        <Col xs={12} md={8} lg={3}>
          <Select allowClear placeholder={t("apartments.bedrooms")} style={{ width: "100%" }} value={params.bedrooms}
            onChange={(v) => url.set({ bedrooms: v })}
            options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 0 ? t("apartments.noBedroom") : tn("apartments.bedroomsN", n) }))} />
        </Col>
        <Col xs={12} md={8} lg={3}>
          <Select allowClear placeholder={t("apartments.furnished")} style={{ width: "100%" }}
            value={params.furnished === undefined ? undefined : String(params.furnished)}
            onChange={(v) => url.set({ furnished: v })}
            options={[{ value: "true", label: t("apartments.furnished") }, { value: "false", label: t("apartments.unfurnished") }]} />
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber key={`min-${params.minRent}`} placeholder={t("apartments.minRent")} min={0} style={{ width: "50%" }}
              defaultValue={params.minRent}
              onBlur={(e) => url.set({ minRent: e.target.value || undefined })}
              onPressEnter={(e) => url.set({ minRent: (e.target as HTMLInputElement).value || undefined })} />
            <InputNumber key={`max-${params.maxRent}`} placeholder={t("apartments.maxRent")} min={0} style={{ width: "50%" }}
              defaultValue={params.maxRent}
              onBlur={(e) => url.set({ maxRent: e.target.value || undefined })}
              onPressEnter={(e) => url.set({ maxRent: (e.target as HTMLInputElement).value || undefined })} />
          </Space.Compact>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <Select style={{ width: "100%" }} value={params.archived ? "archived" : "current"}
            onChange={(v) => url.set({ archived: v === "archived" ? true : undefined })}
            options={[{ value: "current", label: t("common.current") }, { value: "archived", label: t("common.archived") }]} />
        </Col>
        </FilterPanel>
      </Row>
      <ResponsiveTable<UnitSummary> rowKey="id" columns={columns} dataSource={units.data?.content} loading={units.isFetching}
        onChange={onChange} scroll={{ x: 900 }} size="middle"
        locale={{
          emptyText: units.error ? errorMessage(units.error) : (
            <Empty description={hasFilters ? t("apartments.noMatch") : t("apartments.empty")}>
              {!hasFilters && canManage && onAddUnit && (
                <Button type="primary" icon={<PlusOutlined />} onClick={onAddUnit}>{t("apartments.addFirst")}</Button>
              )}
            </Empty>
          ),
        }}
        pagination={{
          current: params.page + 1, pageSize: params.size, total: units.data?.totalElements ?? 0,
          showSizeChanger: true, showTotal: (total) => tn("count.apartments", total),
        }} />
      {hasFilters && (
        <Flex justify="end"><Button type="link" onClick={() => url.set(Object.fromEntries(
          ["propertyId", "buildingId", "status", "type", "bedrooms", "floor", "furnished", "minRent", "maxRent", "search",
            "archived"].filter((k) => !(propertyId && k === "propertyId")).map((k) => [k, undefined])))}>
          {t("common.clearFilters")}
        </Button></Flex>
      )}
      {statusUnit && (
        <ChangeStatusModal open unitId={statusUnit.id} unitNumber={statusUnit.unitNumber} status={statusUnit.status}
          onClose={() => setStatusUnit(undefined)} />
      )}
    </Card>
  );
}
