"use client";

import { AppstoreAddOutlined, BankOutlined, BarsOutlined, DownOutlined, EditOutlined, HomeOutlined, InboxOutlined, PlusOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Breadcrumb, Button, Card, Col, Drawer, Dropdown, Flex, Grid, Image, Result, Row, Segmented, Skeleton, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { BuildingFormModal } from "@/components/portfolio/BuildingFormModal";
import { BuildingExplorer } from "@/components/portfolio/explorer/BuildingExplorer";
import { ApartmentInspector, FlatInspector, PropertyInspector } from "@/components/portfolio/explorer/Inspector";
import { SetupChecklist } from "@/components/portfolio/explorer/SetupChecklist";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { PropertyFormDrawer } from "@/components/portfolio/PropertyFormDrawer";
import { PropertyStatusTag } from "@/components/portfolio/tags";
import { UnitFormDrawer } from "@/components/portfolio/UnitFormDrawer";
import { UnitsTable } from "@/components/portfolio/UnitsTable";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { SetupStepKey } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { useT } from "@/i18n/provider";
import { formatMoney, formatPercent } from "@/lib/format";
import { useLabels } from "@/lib/labels";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { brand } from "@/lib/theme";
import { useUrlState } from "@/lib/url-state";

function PropertyExplorerPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useTenant();
  const router = useRouter();
  const url = useUrlState();
  const screens = Grid.useBreakpoint();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManage } = usePortfolioPermissions();
  const { t } = useT();
  const labels = useLabels();
  const [editOpen, setEditOpen] = useState(false);
  const [flatOpen, setFlatOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const property = useQuery({ queryKey: ["property", id], queryFn: () => api.property(id) });
  const structure = useQuery({ queryKey: ["structure", id], queryFn: () => api.propertyStructure(id) });
  const flatId = url.get("flat");
  const apartmentId = url.get("apt");
  const view = url.get("view") === "list" ? "list" : "building";

  const archive = useMutation({
    mutationFn: () => (property.data?.status === "ARCHIVED" ? api.restoreProperty(id) : api.archiveProperty(id)),
    onSuccess: (p) => { message.success(t(p.status === "ARCHIVED" ? "explorer.archived" : "explorer.restored", { name: p.name })); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });

  const rent = useMemo(() => {
    const s = structure.data;
    return s
      ? [...s.flats.flatMap((f) => f.floors), ...s.unassigned].flatMap((f) => f.apartments).reduce((sum, a) => sum + a.baseRent, 0)
      : null;
  }, [structure.data]);

  if (property.isPending) {
    return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>;
  }
  if (property.error) {
    return isApiError(property.error, "NOT_FOUND")
      ? <Result status="404" title={t("properties.notFound")} extra={<Link href="/properties"><Button>{t("properties.allProperties")}</Button></Link>} />
      : <Alert type="error" showIcon title={errorMessage(property.error)} />;
  }
  const p = property.data;
  const s = structure.data;
  const archived = p.status === "ARCHIVED";
  const editable = canManage && !archived;
  const flat = p.buildings.find((b) => b.id === flatId);
  const apartmentFlat = s?.flats.find((f) => f.id === flatId);
  const apartmentNumber = s && apartmentId
    ? [...s.flats.flatMap((f) => f.floors), ...s.unassigned].flatMap((f) => f.apartments).find((a) => a.id === apartmentId)?.unitNumber
    : undefined;

  const select = (next: { flat?: string; apt?: string }) => url.set({ flat: next.flat, apt: next.apt });
  const onSetupAction = (key: SetupStepKey) => {
    if (key === "flats") {
      setFlatOpen(true);
    } else if (key === "apartments") {
      router.push(`/properties/${p.id}/bulk`);
    } else if (key === "rooms" && s) {
      const missing = s.flats.flatMap((f) => f.floors.flatMap((fl) => fl.apartments.map((a) => ({ a, flat: f.id }))))
        .concat(s.unassigned.flatMap((fl) => fl.apartments.map((a) => ({ a, flat: "" }))))
        .find(({ a }) => a.rooms.length === 0);
      if (missing) {
        select({ flat: missing.flat || undefined, apt: missing.a.id });
      }
    } else if (key === "details") {
      setEditOpen(true);
    } else {
      select({});
    }
  };

  const inspectorTitle = apartmentId ? t("explorer.apartment", { number: apartmentNumber ?? "" }) : flat ? flat.name : t("explorer.property");
  const inspector = apartmentId && s ? (
    <ApartmentInspector key={apartmentId} unitId={apartmentId} property={p} structure={s} editable={editable}
      flatAmenities={apartmentFlat ? { name: apartmentFlat.name, amenities: apartmentFlat.amenities } : null} />
  ) : flat ? (
    <FlatInspector key={flat.id} flat={flat} property={p} editable={editable} />
  ) : (
    <PropertyInspector property={p} editable={editable} onSelectFlat={(fid) => select({ flat: fid })} />
  );

  const addMenu = {
    items: [
      { key: "flat", icon: <BankOutlined />, label: t("explorer.addFlat"), onClick: () => setFlatOpen(true) },
      { key: "apartment", icon: <HomeOutlined />, label: t("explorer.addOne"), onClick: () => setUnitOpen(true) },
      { key: "many", icon: <AppstoreAddOutlined />, label: t("explorer.addMany"), onClick: () => router.push(`/properties/${p.id}/bulk${flatId ? `?flat=${flatId}` : ""}`) },
    ],
  };

  return (
    <>
      <Breadcrumb style={{ marginBottom: 12 }} items={[
        { title: <Link href="/properties">{t("nav.properties")}</Link> },
        { title: flatId || apartmentId ? <a onClick={() => select({})}>{p.name}</a> : p.name },
        ...(flat ? [{ title: apartmentId ? <a onClick={() => select({ flat: flat.id })}>{flat.name}</a> : flat.name }] : []),
        ...(apartmentId ? [{ title: apartmentNumber ?? t("apartments.apartment") }] : []),
      ]} />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Flex gap={16} wrap align="center">
          {p.coverPhotoUrl
            ? <Image src={p.coverPhotoUrl} alt={p.name} width={112} height={84} style={{ objectFit: "cover", borderRadius: 10 }} />
            : <Flex align="center" justify="center" style={{ width: 112, height: 84, borderRadius: 10, background: "#e6f4f1" }}>
              <BankOutlined style={{ fontSize: 34, color: brand.primary }} />
            </Flex>}
          <div style={{ flex: 1, minWidth: 220 }}>
            <Space align="center" wrap>
              <Typography.Title level={3} style={{ margin: 0 }}>{p.name}</Typography.Title>
              <PropertyStatusTag status={p.status} />
              <Tag>{labels.propertyType(p.type)}</Tag>
            </Space>
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {p.code} · {[p.district, p.city].filter(Boolean).join(", ")}
            </Typography.Text>
            <Flex gap={24} wrap style={{ marginTop: 8 }}>
              <Kpi label={t("explorer.flats")} value={p.setup.flats} />
              <Kpi label={t("explorer.apartments")} value={p.setup.apartments} />
              <Kpi label={t("explorer.rooms")} value={p.setup.rooms} />
              <Kpi label={t("explorer.occupied")} value={`${p.unitStats.occupied} · ${formatPercent(p.unitStats.occupancyRate)}`} />
              <Kpi label={t("explorer.monthlyRent")} value={formatMoney(rent)} />
            </Flex>
          </div>
          {canManage && (
            <Space wrap>
              {editable && <Dropdown menu={addMenu} trigger={["click"]}><Button type="primary" icon={<PlusOutlined />}>{t("explorer.addMenu")} <DownOutlined /></Button></Dropdown>}
              {editable && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
              {archived
                ? <Button icon={<UndoOutlined />} loading={archive.isPending} onClick={() => archive.mutate()}>{t("common.restore")}</Button>
                : <Button type="text" danger icon={<InboxOutlined />} aria-label={t("explorer.archiveProperty")} onClick={() => modal.confirm({
                  title: t("explorer.archiveTitle", { name: p.name }), okText: t("common.archive"), okButtonProps: { danger: true },
                  content: t("explorer.archiveText"),
                  onOk: () => archive.mutateAsync(),
                })} />}
            </Space>
          )}
        </Flex>
      </Card>

      {archived && <Alert type="warning" showIcon style={{ marginBottom: 16 }} title={t("explorer.archivedNotice")} />}
      {editable && <SetupChecklist setup={p.setup} onAction={onSetupAction} />}

      <Row gutter={16} align="top">
        <Col xs={24} lg={15} xl={16}>
          <Card title={<Segmented value={view} onChange={(v) => url.set({ view: v === "list" ? "list" : undefined })}
            options={[{ value: "building", icon: <BankOutlined />, label: t("explorer.buildingsView") }, { value: "list", icon: <BarsOutlined />, label: t("explorer.listView") }]} />}>
            {view === "building"
              ? (s ? <BuildingExplorer structure={s} selectedFlatId={flatId} selectedApartmentId={apartmentId}
                onSelectFlat={(fid) => select({ flat: fid })}
                onSelectApartment={(aid, fid) => select({ flat: fid ?? undefined, apt: aid })} /> : <Skeleton active />)
              : <UnitsTable propertyId={p.id} onOpenUnit={(aid) => select({ apt: aid })} onAddUnit={editable ? () => setUnitOpen(true) : undefined} />}
          </Card>
        </Col>
        {screens.lg && (
          <Col lg={9} xl={8}>
            <Card title={inspectorTitle} style={{ position: "sticky", top: 16 }}
              extra={(flatId || apartmentId) && <Button type="link" size="small" onClick={() => select(apartmentId && flatId ? { flat: flatId } : {})}>{t("common.back")}</Button>}
              styles={{ body: { maxHeight: "calc(100vh - 140px)", overflowY: "auto" } }}>
              {inspector}
            </Card>
          </Col>
        )}
      </Row>
      {!screens.lg && (
        <>
          {!flatId && !apartmentId && <Card title={t("explorer.property")} style={{ marginTop: 16 }}>{inspector}</Card>}
          <Drawer open={!!(flatId || apartmentId)} placement="bottom" size="85%" title={inspectorTitle}
            onClose={() => select({})} destroyOnHidden>
            {inspector}
          </Drawer>
        </>
      )}

      <PropertyFormDrawer open={editOpen} property={p} onClose={() => setEditOpen(false)} />
      <BuildingFormModal open={flatOpen} propertyId={p.id} onClose={() => setFlatOpen(false)} />
      <UnitFormDrawer open={unitOpen} propertyId={p.id} buildingId={flatId} onClose={() => setUnitOpen(false)}
        onSaved={(u) => select({ flat: u.buildingId ?? undefined, apt: u.id })} />
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{value}</div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PropertyExplorerPage />
    </Suspense>
  );
}
