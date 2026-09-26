"use client";

import { AppstoreAddOutlined, ArrowLeftOutlined, EditOutlined, EnvironmentOutlined, InboxOutlined, MoreOutlined, PlusOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Descriptions, Dropdown, Empty, Flex, Progress, Result, Row, Skeleton, Space, Statistic, Table, Tabs, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { AmenityEditor } from "@/components/portfolio/AmenityEditor";
import { BuildingFormModal } from "@/components/portfolio/BuildingFormModal";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { PhotoGallery } from "@/components/portfolio/PhotoGallery";
import { PropertyFormDrawer } from "@/components/portfolio/PropertyFormDrawer";
import { PropertyStatusTag } from "@/components/portfolio/tags";
import { UnitDrawer } from "@/components/portfolio/UnitDrawer";
import { UnitFormDrawer } from "@/components/portfolio/UnitFormDrawer";
import { UnitGridView } from "@/components/portfolio/UnitGridView";
import { UnitsTable } from "@/components/portfolio/UnitsTable";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { Building } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatPercent } from "@/lib/format";
import { floorLabel, PROPERTY_TYPE_LABELS } from "@/lib/labels";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useTenant();
  const router = useRouter();
  const url = useUrlState();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManage } = usePortfolioPermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [buildingModal, setBuildingModal] = useState<{ open: boolean; building?: Building }>({ open: false });
  const [openUnit, setOpenUnit] = useState<string>();
  const tab = url.get("tab") ?? "overview";
  const property = useQuery({ queryKey: ["property", id], queryFn: () => api.property(id) });

  const refresh = () => invalidatePortfolio(queryClient);
  const archive = useMutation({
    mutationFn: () => (property.data?.status === "ARCHIVED" ? api.restoreProperty(id) : api.archiveProperty(id)),
    onSuccess: (p) => { message.success(p.status === "ARCHIVED" ? `${p.name} archived` : `${p.name} restored`); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setPropertyAmenities(id, ids),
    onSuccess: () => { message.success("Amenities saved"); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const buildingArchive = useMutation({
    mutationFn: (b: Building) => (b.status === "ARCHIVED" ? api.restoreBuilding(b.id) : api.archiveBuilding(b.id)),
    onSuccess: (b) => { message.success(b.status === "ARCHIVED" ? `${b.name} archived` : `${b.name} restored`); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (property.isPending) {
    return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>;
  }
  if (property.error) {
    return isApiError(property.error, "NOT_FOUND")
      ? <Result status="404" title="Property not found" extra={<Link href="/properties"><Button>All properties</Button></Link>} />
      : <Alert type="error" showIcon title={errorMessage(property.error)} />;
  }
  const p = property.data;
  const archived = p.status === "ARCHIVED";
  const editable = canManage && !archived;
  const stats = p.unitStats;
  const mapUrl = p.latitude != null && p.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}` : null;

  const buildingMenu = (b: Building): MenuProps["items"] => [
    ...(b.status === "ACTIVE" ? [{ key: "edit", label: "Edit", onClick: () => setBuildingModal({ open: true, building: b }) }] : []),
    b.status === "ARCHIVED"
      ? { key: "restore", label: "Restore", onClick: () => buildingArchive.mutate(b) }
      : {
        key: "archive", label: "Archive", danger: true, onClick: () => modal.confirm({
          title: `Archive ${b.name}?`, okText: "Archive", okButtonProps: { danger: true },
          content: "Its units are archived too. Occupied or reserved units must be freed first.",
          onOk: () => buildingArchive.mutateAsync(b),
        }),
      },
  ];

  return (
    <>
      <Link href="/properties"><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0 }}>Properties</Button></Link>
      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Space align="center" wrap>
            <Typography.Title level={3} style={{ margin: 0 }}>{p.name}</Typography.Title>
            <PropertyStatusTag status={p.status} />
          </Space>
          <div>
            <Typography.Text type="secondary">
              {p.code} · {PROPERTY_TYPE_LABELS[p.type]} · {[p.district, p.city].filter(Boolean).join(", ")}
            </Typography.Text>
          </div>
        </div>
        {canManage && (
          <Space wrap>
            {!archived && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Edit</Button>}
            {!archived && <Button icon={<PlusOutlined />} onClick={() => setUnitOpen(true)}>Add unit</Button>}
            {!archived && <Link href={`/properties/${id}/bulk`}><Button type="primary" icon={<AppstoreAddOutlined />}>Bulk add units</Button></Link>}
            {archived ? (
              <Button icon={<UndoOutlined />} loading={archive.isPending} onClick={() => archive.mutate()}>Restore</Button>
            ) : (
              <Button danger icon={<InboxOutlined />} onClick={() => modal.confirm({
                title: `Archive ${p.name}?`, okText: "Archive", okButtonProps: { danger: true },
                content: "Its buildings and units are archived too and disappear from lists. Occupied or reserved units must be freed first. You can restore it later.",
                onOk: () => archive.mutateAsync(),
              })}>Archive</Button>
            )}
          </Space>
        )}
      </Flex>
      {archived && <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        title={`Archived on ${formatDate(p.archivedAt)}. Restore it to make changes.`} />}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card><Statistic title="Units" value={stats.total} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Vacant" value={stats.vacant} styles={{ content: { color: "#16a34a" } }} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Occupied" value={stats.occupied} styles={{ content: { color: "#2563eb" } }} /></Card></Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Occupancy" value={formatPercent(stats.occupancyRate)} />
            <Progress percent={Math.round(stats.occupancyRate * 100)} showInfo={false} size="small" />
          </Card>
        </Col>
      </Row>
      <Tabs activeKey={tab} onChange={(key) => url.set({ tab: key === "overview" ? undefined : key })} destroyOnHidden items={[
        {
          key: "overview", label: "Overview", children: (
            <Flex vertical gap={16}>
              <Card title="Details" extra={mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer"><EnvironmentOutlined /> Open in Google Maps</a>}>
                <Descriptions column={{ xs: 1, md: 2 }} size="small">
                  <Descriptions.Item label="Address">{p.address ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Country">{p.country}</Descriptions.Item>
                  <Descriptions.Item label="Year built">{p.yearBuilt ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Buildings">{p.buildings.filter((b) => b.status === "ACTIVE").length}</Descriptions.Item>
                  <Descriptions.Item label="Added">{formatDate(p.createdAt)}</Descriptions.Item>
                  {p.description && <Descriptions.Item label="Description" span="filled">{p.description}</Descriptions.Item>}
                </Descriptions>
              </Card>
              <Card title="Amenities">
                <AmenityEditor scope="PROPERTY" value={p.amenities} canEdit={editable} saving={amenities.isPending}
                  onSave={(ids) => amenities.mutate(ids)} />
              </Card>
              <Card title="Photos">
                <PhotoGallery owner="properties" ownerId={p.id} photos={p.photos} max={15} canEdit={editable} onChanged={refresh} />
              </Card>
            </Flex>
          ),
        },
        {
          key: "buildings", label: `Buildings (${p.buildings.filter((b) => b.status === "ACTIVE").length})`, children: (
            <Card extra={editable && <Button icon={<PlusOutlined />} onClick={() => setBuildingModal({ open: true })}>Add building</Button>}
              title="Buildings">
              <Table<Building> rowKey="id" dataSource={p.buildings} pagination={false} scroll={{ x: 700 }}
                locale={{ emptyText: <Empty description="No buildings. Units can belong to the property directly." /> }}
                columns={[
                  { title: "Building", key: "name", render: (_, b) => <><Typography.Text strong>{b.name}</Typography.Text> <Typography.Text type="secondary">({b.code})</Typography.Text></> },
                  { title: "Floors", key: "floors", render: (_, b) => `${floorLabel(-b.basementFloors)} – ${floorLabel(b.floorsCount)}` },
                  { title: "Lift", dataIndex: "hasLift", render: (v: boolean) => (v ? "Yes" : "No") },
                  { title: "Units", key: "units", align: "right", render: (_, b) => b.unitStats.total },
                  { title: "Vacant", key: "vacant", align: "right", render: (_, b) => b.unitStats.vacant },
                  { title: "Occupancy", key: "occ", width: 150, render: (_, b) => <Progress percent={Math.round(b.unitStats.occupancyRate * 100)} size="small" /> },
                  { title: "Status", dataIndex: "status", render: (s: string) => (s === "ARCHIVED" ? <Typography.Text type="secondary">Archived</Typography.Text> : "Active") },
                  ...(editable ? [{
                    key: "actions", width: 56, align: "right" as const, render: (_: unknown, b: Building) => (
                      <Dropdown menu={{ items: buildingMenu(b) }} trigger={["click"]}>
                        <Button type="text" icon={<MoreOutlined />} aria-label={`Actions for ${b.name}`} />
                      </Dropdown>
                    ),
                  }] : []),
                ]} />
            </Card>
          ),
        },
        {
          key: "units", label: `Units (${stats.total})`, children: (
            <UnitsTable propertyId={p.id} onOpenUnit={setOpenUnit} onAddUnit={editable ? () => setUnitOpen(true) : undefined} />
          ),
        },
        {
          key: "grid", label: "Unit grid", children: <UnitGridView propertyId={p.id} buildings={p.buildings} onOpenUnit={setOpenUnit} />,
        },
      ]} />
      <PropertyFormDrawer open={editOpen} property={p} onClose={() => setEditOpen(false)} />
      <UnitFormDrawer open={unitOpen} propertyId={p.id} onClose={() => setUnitOpen(false)} />
      <BuildingFormModal open={buildingModal.open} propertyId={p.id} building={buildingModal.building}
        onClose={() => setBuildingModal({ open: false })} />
      <UnitDrawer unitId={openUnit} onClose={() => setOpenUnit(undefined)} />
      {!archived && stats.total === 0 && canManage && tab === "overview" && (
        <Alert type="info" showIcon style={{ marginTop: 16 }} title="No units yet"
          description={<>Add {p.buildings.length ? "" : "buildings and "}units one by one, or create a whole building at once with{" "}
            <Typography.Link onClick={() => router.push(`/properties/${id}/bulk`)}>Bulk add units</Typography.Link>.</>} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PropertyPage />
    </Suspense>
  );
}
