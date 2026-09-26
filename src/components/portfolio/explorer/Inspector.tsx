"use client";

import { AppstoreAddOutlined, CopyOutlined, EditOutlined, EnvironmentOutlined, ExportOutlined, InboxOutlined, PlusOutlined, SwapOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Descriptions, Divider, Flex, Progress, Skeleton, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { Amenity, Building, PropertyDetails, PropertyStructure } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { useT } from "@/i18n/provider";
import { formatMoney, formatPercent } from "@/lib/format";
import { useLabels } from "@/lib/labels";
import { useAllowedTransitions } from "@/lib/portfolio-hooks";
import { AmenityEditor } from "../AmenityEditor";
import { BuildingFormModal } from "../BuildingFormModal";
import { ChangeStatusModal } from "../ChangeStatusModal";
import { CopyRoomsModal } from "../CopyRoomsModal";
import { invalidatePortfolio } from "../invalidate";
import { PhotoGallery } from "../PhotoGallery";
import { RoomsEditor } from "../RoomsEditor";
import { StatusBar } from "../StatusBar";
import { UnitStatusTag } from "../tags";
import { UnitFormDrawer } from "../UnitFormDrawer";

function Block({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, color: "#6b7280" }}>{title}</Typography.Text>
        {extra}
      </Flex>
      {children}
    </div>
  );
}

function Inherited({ label, amenities }: { label: string; amenities: Amenity[] }) {
  if (amenities.length === 0) {
    return null;
  }
  return (
    <Flex wrap gap={6} align="center" style={{ marginTop: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}:</Typography.Text>
      {amenities.map((a) => <Tag key={a.id} style={{ marginInlineEnd: 0, color: "#6b7280" }}>{a.name}</Tag>)}
    </Flex>
  );
}

// ---------------------------------------------------------------- property

export function PropertyInspector({ property: p, editable, onSelectFlat }: {
  property: PropertyDetails; editable: boolean; onSelectFlat: (id: string) => void;
}) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setPropertyAmenities(p.id, ids),
    onSuccess: () => { message.success(t("explorer.sharedSaved")); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const mapUrl = p.latitude != null && p.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}` : null;
  const flats = p.buildings.filter((b) => b.status === "ACTIVE");

  return (
    <>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {t("explorer.selectHint")}
      </Typography.Text>
      <Block title={t("explorer.sharedByEveryone")}>
        <AmenityEditor scope="PROPERTY" value={p.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
      </Block>
      {flats.length > 0 && (
        <Block title={t("explorer.flats")}>
          <Flex vertical gap={6}>
            {flats.map((b) => (
              <button key={b.id} type="button" onClick={() => onSelectFlat(b.id)}
                style={{ textAlign: "left", padding: "8px 10px", border: "1px solid #eef0f0", borderRadius: 8, background: "#fff", cursor: "pointer" }}>
                <Flex justify="space-between"><Typography.Text strong>{b.name}</Typography.Text><Typography.Text type="secondary">{tn("count.apartments", b.unitStats.total)}</Typography.Text></Flex>
                <Progress percent={Math.round(b.unitStats.occupancyRate * 100)} size="small" style={{ margin: 0 }} />
              </button>
            ))}
          </Flex>
        </Block>
      )}
      <Block title={t("explorer.about")}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t("common.address")}>{p.address ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("properties.yearBuilt")}>{p.yearBuilt ?? "—"}</Descriptions.Item>
          {mapUrl && <Descriptions.Item label={t("explorer.map")}><a href={mapUrl} target="_blank" rel="noreferrer"><EnvironmentOutlined /> {t("explorer.googleMaps")}</a></Descriptions.Item>}
        </Descriptions>
        {p.description && <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>{p.description}</Typography.Paragraph>}
      </Block>
      <Block title={t("explorer.photos", { count: p.photos.length, max: 15 })}>
        <PhotoGallery owner="properties" ownerId={p.id} photos={p.photos} max={15} canEdit={editable} onChanged={() => invalidatePortfolio(queryClient)} />
      </Block>
    </>
  );
}

// ---------------------------------------------------------------- flat

export function FlatInspector({ flat, property, editable }: { flat: Building; property: PropertyDetails; editable: boolean }) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const labels = useLabels();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setBuildingAmenities(flat.id, ids),
    onSuccess: () => { message.success(t("explorer.flatAmenitiesSaved")); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const archive = useMutation({
    mutationFn: () => (flat.status === "ARCHIVED" ? api.restoreBuilding(flat.id) : api.archiveBuilding(flat.id)),
    onSuccess: (b) => { message.success(t(b.status === "ARCHIVED" ? "explorer.archived" : "explorer.restored", { name: b.name })); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const s = flat.unitStats;

  return (
    <>
      <Flex justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>{flat.name}</Typography.Title>
          <Typography.Text type="secondary">
            {t("explorer.flatCode", { code: flat.code })} · {t("explorer.floorsRange", { from: labels.floor(-flat.basementFloors), to: labels.floor(flat.floorsCount).toLowerCase() })}{flat.hasLift ? ` · ${t("explorer.lift")}` : ""}
          </Typography.Text>
        </div>
        {editable && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
      </Flex>
      <Block title={t("explorer.flatStats", { apartments: tn("count.apartments", s.total), percent: formatPercent(s.occupancyRate) })}>
        <StatusBar counts={{ VACANT: s.vacant, RESERVED: s.reserved, OCCUPIED: s.occupied, MAINTENANCE: s.maintenance, INACTIVE: s.inactive }} />
      </Block>
      {editable && (
        <Flex gap={8} wrap style={{ marginBottom: 20 }}>
          <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>{t("explorer.addApartment")}</Button>
          <Link href={`/properties/${property.id}/bulk?flat=${flat.id}`}><Button type="primary" icon={<AppstoreAddOutlined />}>{t("explorer.addManyShort")}</Button></Link>
        </Flex>
      )}
      <Block title={t("explorer.sharedByFlat")}>
        <AmenityEditor scope="PROPERTY" value={flat.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
        <Inherited label={t("explorer.alsoFromProperty")} amenities={property.amenities} />
      </Block>
      {flat.description && <Typography.Paragraph type="secondary">{flat.description}</Typography.Paragraph>}
      {editable && (
        <>
          <Divider />
          <Button danger icon={<InboxOutlined />} onClick={() => modal.confirm({
            title: t("explorer.archiveFlatTitle", { name: flat.name }), okText: t("common.archive"), okButtonProps: { danger: true },
            content: t("explorer.archiveFlatText"),
            onOk: () => archive.mutateAsync(),
          })}>{t("explorer.archiveFlat")}</Button>
        </>
      )}
      <BuildingFormModal open={editOpen} propertyId={property.id} building={flat} onClose={() => setEditOpen(false)} />
      <UnitFormDrawer open={addOpen} propertyId={property.id} buildingId={flat.id} onClose={() => setAddOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------- apartment

export function ApartmentInspector({ unitId, property, structure, flatAmenities, editable }: {
  unitId: string; property: PropertyDetails; structure: PropertyStructure; flatAmenities: { name: string; amenities: Amenity[] } | null; editable: boolean;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const labels = useLabels();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const unit = useQuery({ queryKey: ["unit", unitId], queryFn: () => api.unit(unitId) });
  const transitions = useAllowedTransitions(unit.data?.status);
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setUnitAmenities(unitId, ids),
    onSuccess: () => { message.success(t("explorer.amenitiesSaved")); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const archive = useMutation({
    mutationFn: () => (unit.data?.archivedAt ? api.restoreUnit(unitId) : api.archiveUnit(unitId)),
    onSuccess: (u) => { message.success(t(u.archivedAt ? "explorer.apartmentArchived" : "explorer.apartmentRestored")); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (unit.isPending) {
    return <Skeleton active />;
  }
  if (unit.error) {
    return <Alert type="error" showIcon title={errorMessage(unit.error)} />;
  }
  const u = unit.data;
  const source = [...structure.flats.flatMap((f) => f.floors), ...structure.unassigned].flatMap((f) => f.apartments)
    .find((a) => a.id === u.id);
  const taken = u.status === "OCCUPIED" || u.status === "RESERVED";

  return (
    <>
      <Flex justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 12 }}>
        <div>
          <Space align="center">
            <Typography.Title level={4} style={{ margin: 0 }}>{u.unitNumber}</Typography.Title>
            <UnitStatusTag status={u.status} />
          </Space>
          <Typography.Text type="secondary" style={{ display: "block" }}>
            {labels.unitType(u.type)} · {labels.floor(u.floor)}{u.buildingName ? ` · ${u.buildingName}` : ""}
          </Typography.Text>
        </div>
        <Link href={`/units/${u.id}`}><Button type="text" icon={<ExportOutlined />} aria-label={t("explorer.openPage")} /></Link>
      </Flex>
      <Flex gap={8} wrap style={{ marginBottom: 16 }}>
        {transitions.length > 0 && <Button type="primary" icon={<SwapOutlined />} onClick={() => setStatusOpen(true)}>{t("explorer.changeStatus")}</Button>}
        {editable && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
      </Flex>
      <Flex gap={8} style={{ marginBottom: 20 }}>
        {[
          [t("common.rent"), formatMoney(u.baseRent)],
          [t("explorer.bedBath"), `${u.bedrooms} / ${u.bathrooms}`],
          [t("common.size"), u.sizeSqm ? `${u.sizeSqm} m²` : "—"],
        ].map(([label, value]) => (
          <div key={label} style={{ flex: 1, padding: "8px 10px", background: "#f6f8f8", borderRadius: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
            <div style={{ fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </Flex>
      <Block title={t("explorer.rooms")}>
        <RoomsEditor unitId={u.id} canEdit={editable} compact extra={source && source.rooms.length > 0 && (
          <Button icon={<CopyOutlined />} onClick={() => setCopyOpen(true)}>{t("explorer.copyTo")}</Button>
        )} />
      </Block>
      <Block title={t("apartments.amenities")}>
        <AmenityEditor scope="UNIT" value={u.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
        {flatAmenities && <Inherited label={t("explorer.fromFlat", { name: flatAmenities.name })} amenities={flatAmenities.amenities} />}
        <Inherited label={t("explorer.fromProperty")} amenities={property.amenities} />
      </Block>
      <Block title={t("explorer.photos", { count: u.photos.length, max: 10 })}>
        <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={editable} onChanged={() => invalidatePortfolio(queryClient)} />
      </Block>
      {u.notes && <Block title={t("common.notes")}><Typography.Paragraph>{u.notes}</Typography.Paragraph></Block>}
      {editable && (
        <Button danger={!u.archivedAt} icon={u.archivedAt ? <UndoOutlined /> : <InboxOutlined />} disabled={!u.archivedAt && taken}
          title={taken ? t("explorer.cannotArchiveTaken") : undefined}
          onClick={() => (u.archivedAt ? archive.mutate() : modal.confirm({
            title: t("explorer.archiveApartmentTitle", { number: u.unitNumber }), okText: t("common.archive"), okButtonProps: { danger: true },
            content: t("explorer.archiveApartmentText"), onOk: () => archive.mutateAsync(),
          }))}>
          {u.archivedAt ? t("explorer.restoreApartment") : t("explorer.archiveApartment")}
        </Button>
      )}
      <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status} onClose={() => setStatusOpen(false)} />
      <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
      {source && <CopyRoomsModal open={copyOpen} source={source} structure={structure} onClose={() => setCopyOpen(false)} />}
    </>
  );
}
