"use client";

import { AppstoreAddOutlined, CameraOutlined, CopyOutlined, EditOutlined, EnvironmentOutlined, ExportOutlined, InboxOutlined, MoreOutlined, PlusOutlined, SwapOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Divider, Dropdown, Flex, Image, Modal, Progress, Skeleton, Space, Tag, Tooltip, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { PhotoOwner } from "@/lib/api/tenant-api";
import type { Amenity, Building, Photo, PropertyDetails, PropertyStructure, StructureApartment, RoomType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { useT } from "@/i18n/provider";
import { formatMoney, formatPercent } from "@/lib/format";
import { useLabels } from "@/lib/labels";
import { layoutSuggestions } from "@/lib/room-layouts";
import { useAllowedTransitions, usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { AmenityEditor } from "../AmenityEditor";
import { BuildingFormModal } from "../BuildingFormModal";
import { ChangeStatusModal } from "../ChangeStatusModal";
import { invalidatePortfolio } from "../invalidate";
import { PhotoGallery } from "../PhotoGallery";
import { RoomsEditor } from "../RoomsEditor";
import { StatusBar } from "../StatusBar";
import { UnitStatusTag } from "../tags";
import { UnitFormDrawer } from "../UnitFormDrawer";
import { BedroomWarning } from "../BedroomWarning";
import { TenancySection } from "@/components/leases/TenancySection";

export function Block({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
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
  const facts = [p.address, p.yearBuilt ? t("explorer.builtIn", { year: p.yearBuilt }) : null].filter(Boolean).join(" · ");

  return (
    <>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        {t("explorer.selectHint")}
      </Typography.Text>
      {(facts || mapUrl || p.description) && (
        <Block title={t("explorer.about")}>
          {(facts || mapUrl) && (
            <Typography.Text style={{ display: "block" }}>
              {facts}{facts && mapUrl && " · "}
              {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer"><EnvironmentOutlined /> {t("explorer.map")}</a>}
            </Typography.Text>
          )}
          {p.description && <ShortText text={p.description} />}
        </Block>
      )}
      {flats.length > 0 && (
        <Block title={t("explorer.flats")}>
          <Flex vertical>
            {flats.map((b) => (
              <button key={b.id} type="button" onClick={() => onSelectFlat(b.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", border: "none", borderBottom: "1px solid #f0f2f2", background: "none", cursor: "pointer", textAlign: "left" }}>
                <Typography.Text strong style={{ flex: 1 }}>{b.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>{tn("count.apartments", b.unitStats.total)}</Typography.Text>
                <Progress type="circle" size={22} percent={Math.round(b.unitStats.occupancyRate * 100)} showInfo={false} />
                <Typography.Text style={{ width: 36, textAlign: "right", fontSize: 13 }}>{formatPercent(b.unitStats.occupancyRate)}</Typography.Text>
              </button>
            ))}
          </Flex>
        </Block>
      )}
      <Block title={t("explorer.sharedByEveryone")}>
        <AmenityEditor scope="PROPERTY" value={p.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
      </Block>
      <PhotoStrip owner="properties" ownerId={p.id} photos={p.photos} max={15} canEdit={editable} title={p.name} />
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
  const { t, tn } = useT();
  const labels = useLabels();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [addRequest, setAddRequest] = useState<{ type: RoomType; at: number }>();
  const { canReadLeases } = usePortfolioPermissions();
  const unit = useQuery({ queryKey: ["unit", unitId], queryFn: () => api.unit(unitId) });
  const transitions = useAllowedTransitions(unit.data?.status);
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setUnitAmenities(unitId, ids),
    onSuccess: () => { message.success(t("explorer.amenitiesSaved")); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const copyFrom = useMutation({
    mutationFn: (source: StructureApartment) => api.copyRooms(source.id, [unitId]).then(() => source),
    onSuccess: (source) => { message.success(t("explorer.roomsCopied", { number: source.unitNumber })); invalidatePortfolio(queryClient); },
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
  const suggestions = editable && u.rooms.length === 0 ? layoutSuggestions(structure, u.id, u.type, u.buildingId) : [];
  const taken = u.status === "OCCUPIED" || u.status === "RESERVED";
  const roomsSize = u.rooms.reduce((sum, r) => sum + (r.sizeSqm ?? 0), 0);
  const inherited = [...(flatAmenities?.amenities ?? []), ...property.amenities];
  const moreItems: MenuProps["items"] = editable ? [
    u.archivedAt
      ? { key: "restore", icon: <UndoOutlined />, label: t("explorer.restoreApartment"), onClick: () => archive.mutate() }
      : {
        key: "archive", icon: <InboxOutlined />, danger: true, disabled: taken, label: t("explorer.archiveApartment"),
        title: taken ? t("explorer.cannotArchiveTaken") : undefined,
        onClick: () => modal.confirm({
          title: t("explorer.archiveApartmentTitle", { number: u.unitNumber }), okText: t("common.archive"), okButtonProps: { danger: true },
          content: t("explorer.archiveApartmentText"), onOk: () => archive.mutateAsync(),
        }),
      },
  ] : [];

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
      <Flex gap={8} style={{ marginBottom: 16 }}>
        {transitions.length > 0 && u.openLeases.length === 0 && <Button type="primary" icon={<SwapOutlined />} onClick={() => setStatusOpen(true)}>{t("explorer.changeStatus")}</Button>}
        {editable && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
        {moreItems.length > 0 && (
          <Dropdown menu={{ items: moreItems }} trigger={["click"]}>
            <Button icon={<MoreOutlined />} aria-label={t("explorer.moreActions")} />
          </Dropdown>
        )}
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
      {canReadLeases && (
        <Block title={t("leases.tenancy")}>
          <TenancySection unit={u} />
        </Block>
      )}
      <Block title={`${tn("count.rooms", u.rooms.length)}${roomsSize > 0 ? ` · ${roomsSize} m²` : ""}`}
        extra={(editable || u.rooms.length > 0) && (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setRoomsOpen(true)}>
            {editable ? t("explorer.manage") : t("explorer.viewAll")}
          </Button>
        )}>
        <BedroomWarning type={u.type} rooms={u.rooms} canEdit={editable}
          onAddBedroom={() => { setAddRequest({ type: "BEDROOM", at: Date.now() }); setRoomsOpen(true); }}
          onChangeType={() => setEditOpen(true)} />
        {u.rooms.length === 0 ? (
          editable ? (
            <Flex vertical gap={8}>
              {suggestions.length > 0 && (
                <>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("explorer.sameLayoutHint")}</Typography.Text>
                  {suggestions.map((a) => (
                    <Button key={a.id} block icon={<CopyOutlined />} loading={copyFrom.isPending && copyFrom.variables?.id === a.id}
                      disabled={copyFrom.isPending} onClick={() => copyFrom.mutate(a)}
                      style={{ height: "auto", padding: "6px 12px", justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal" }}>
                      <span>
                        <Typography.Text strong>{t("explorer.sameRoomsAs", { number: a.unitNumber })}</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                          {a.rooms.map((r) => r.name).join(", ")}
                        </Typography.Text>
                      </span>
                    </Button>
                  ))}
                </>
              )}
              <Button block type="dashed" icon={<PlusOutlined />} onClick={() => setRoomsOpen(true)}>
                {suggestions.length > 0 ? t("explorer.describeOwn") : t("rooms.add")}
              </Button>
            </Flex>
          ) : <Typography.Text type="secondary">{t("rooms.none")}</Typography.Text>
        ) : (
          <Flex wrap gap={6}>
            {u.rooms.map((r) => (
              <Tooltip key={r.id} title={r.notes || undefined}>
                <Tag style={{ marginInlineEnd: 0, padding: "2px 8px", background: "#f6f8f8", borderColor: "#eef0f0" }}>
                  {r.name}{r.sizeSqm ? <Typography.Text type="secondary" style={{ fontSize: 12 }}> · {r.sizeSqm} m²</Typography.Text> : null}
                </Tag>
              </Tooltip>
            ))}
          </Flex>
        )}
      </Block>
      <Block title={t("apartments.amenities")}>
        <AmenityEditor scope="UNIT" value={u.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
        {inherited.length > 0 && (
          <Tooltip title={inherited.map((a) => a.name).join(", ")}>
            <Typography.Text type="secondary" style={{ display: "inline-block", marginTop: 8, fontSize: 12, cursor: "help" }}>
              {t("explorer.sharedCount", { count: inherited.length })}
            </Typography.Text>
          </Tooltip>
        )}
      </Block>
      {u.notes && <Block title={t("common.notes")}><ShortText text={u.notes} /></Block>}
      <PhotoStrip owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={editable}
        title={t("explorer.apartment", { number: u.unitNumber })} />

      <Modal open={roomsOpen} onCancel={() => { setRoomsOpen(false); setAddRequest(undefined); }} footer={null} width={720} destroyOnHidden
        title={t("explorer.roomsOf", { number: u.unitNumber })}>
        <RoomsEditor unitId={u.id} canEdit={editable} addRequest={addRequest} />
      </Modal>
      <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status} onClose={() => setStatusOpen(false)} />
      <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------- shared

/** Long text cut to two lines, expandable. */
export function ShortText({ text }: { text: string }) {
  const { t } = useT();
  return (
    <Typography.Paragraph type="secondary" style={{ margin: "6px 0 0" }}
      ellipsis={{ rows: 2, expandable: "collapsible", symbol: (expanded) => (expanded ? t("explorer.showLess") : t("explorer.showMore")) }}>
      {text}
    </Typography.Paragraph>
  );
}

/** A row of small thumbnails; uploading, ordering and deleting happen in a window. */
export function PhotoStrip({ owner, ownerId, photos, max, canEdit, title }: {
  owner: PhotoOwner; ownerId: string; photos: Photo[]; max: number; canEdit: boolean; title: string;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const shown = photos.slice(0, 4);
  return (
    <Block title={t("explorer.photos", { count: photos.length, max })}
      extra={(canEdit || photos.length > 0) && (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpen(true)}>
          {canEdit ? t("explorer.manage") : t("explorer.viewAll")}
        </Button>
      )}>
      {photos.length === 0 ? (
        canEdit
          ? <Button block type="dashed" icon={<CameraOutlined />} onClick={() => setOpen(true)}>{t("explorer.addPhotos")}</Button>
          : <Typography.Text type="secondary">{t("photos.none")}</Typography.Text>
      ) : (
        <Image.PreviewGroup items={photos.map((p) => p.url)}>
          <Flex gap={6}>
            {shown.map((photo, index) => (
              <div key={photo.id} style={{ position: "relative", flex: "0 0 calc(25% - 5px)" }}>
                <Image src={photo.url} alt={photo.caption ?? ""} width="100%" height={64}
                  style={{ objectFit: "cover", borderRadius: 6 }} />
                {index === 3 && photos.length > 4 && (
                  <button type="button" onClick={() => setOpen(true)} style={{
                    position: "absolute", inset: 0, borderRadius: 6, border: "none", cursor: "pointer",
                    background: "rgba(0,0,0,.45)", color: "#fff", fontWeight: 600,
                  }}>+{photos.length - 4}</button>
                )}
              </div>
            ))}
          </Flex>
        </Image.PreviewGroup>
      )}
      <Modal open={open} onCancel={() => setOpen(false)} footer={null} width={760} destroyOnHidden
        title={`${title} · ${t("explorer.photos", { count: photos.length, max })}`}>
        <PhotoGallery owner={owner} ownerId={ownerId} photos={photos} max={max} canEdit={canEdit}
          onChanged={() => invalidatePortfolio(queryClient)} />
      </Modal>
    </Block>
  );
}
