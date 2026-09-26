"use client";

import { AppstoreAddOutlined, CopyOutlined, EditOutlined, EnvironmentOutlined, ExportOutlined, InboxOutlined, PlusOutlined, SwapOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Descriptions, Divider, Flex, Progress, Skeleton, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { Amenity, Building, PropertyDetails, PropertyStructure } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatMoney, formatPercent } from "@/lib/format";
import { floorLabel, UNIT_TYPE_LABELS } from "@/lib/labels";
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
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setPropertyAmenities(p.id, ids),
    onSuccess: () => { message.success("Shared amenities saved"); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const mapUrl = p.latitude != null && p.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}` : null;
  const flats = p.buildings.filter((b) => b.status === "ACTIVE");

  return (
    <>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Select a flat or an apartment in the drawing to see its details here.
      </Typography.Text>
      <Block title="Shared by everyone">
        <AmenityEditor scope="PROPERTY" value={p.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
      </Block>
      {flats.length > 0 && (
        <Block title="Flats">
          <Flex vertical gap={6}>
            {flats.map((b) => (
              <button key={b.id} type="button" onClick={() => onSelectFlat(b.id)}
                style={{ textAlign: "left", padding: "8px 10px", border: "1px solid #eef0f0", borderRadius: 8, background: "#fff", cursor: "pointer" }}>
                <Flex justify="space-between"><Typography.Text strong>{b.name}</Typography.Text><Typography.Text type="secondary">{b.unitStats.total} apartments</Typography.Text></Flex>
                <Progress percent={Math.round(b.unitStats.occupancyRate * 100)} size="small" style={{ margin: 0 }} />
              </button>
            ))}
          </Flex>
        </Block>
      )}
      <Block title="About">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Address">{p.address ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Year built">{p.yearBuilt ?? "—"}</Descriptions.Item>
          {mapUrl && <Descriptions.Item label="Map"><a href={mapUrl} target="_blank" rel="noreferrer"><EnvironmentOutlined /> Google Maps</a></Descriptions.Item>}
        </Descriptions>
        {p.description && <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>{p.description}</Typography.Paragraph>}
      </Block>
      <Block title={`Photos (${p.photos.length}/15)`}>
        <PhotoGallery owner="properties" ownerId={p.id} photos={p.photos} max={15} canEdit={editable} onChanged={() => invalidatePortfolio(queryClient)} />
      </Block>
    </>
  );
}

// ---------------------------------------------------------------- flat

export function FlatInspector({ flat, property, editable }: { flat: Building; property: PropertyDetails; editable: boolean }) {
  const { api } = useTenant();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setBuildingAmenities(flat.id, ids),
    onSuccess: () => { message.success("Flat amenities saved"); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const archive = useMutation({
    mutationFn: () => (flat.status === "ARCHIVED" ? api.restoreBuilding(flat.id) : api.archiveBuilding(flat.id)),
    onSuccess: (b) => { message.success(b.status === "ARCHIVED" ? `${b.name} archived` : `${b.name} restored`); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const s = flat.unitStats;

  return (
    <>
      <Flex justify="space-between" align="flex-start" gap={8} style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>{flat.name}</Typography.Title>
          <Typography.Text type="secondary">
            Code {flat.code} · {floorLabel(-flat.basementFloors)} to {floorLabel(flat.floorsCount).toLowerCase()}{flat.hasLift ? " · lift" : ""}
          </Typography.Text>
        </div>
        {editable && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Edit</Button>}
      </Flex>
      <Block title={`${s.total} apartments · ${formatPercent(s.occupancyRate)} occupied`}>
        <StatusBar counts={{ VACANT: s.vacant, RESERVED: s.reserved, OCCUPIED: s.occupied, MAINTENANCE: s.maintenance, INACTIVE: s.inactive }} />
      </Block>
      {editable && (
        <Flex gap={8} wrap style={{ marginBottom: 20 }}>
          <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Add apartment</Button>
          <Link href={`/properties/${property.id}/bulk?flat=${flat.id}`}><Button type="primary" icon={<AppstoreAddOutlined />}>Add many</Button></Link>
        </Flex>
      )}
      <Block title="Shared by this flat">
        <AmenityEditor scope="PROPERTY" value={flat.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
        <Inherited label="Also from the property" amenities={property.amenities} />
      </Block>
      {flat.description && <Typography.Paragraph type="secondary">{flat.description}</Typography.Paragraph>}
      {editable && (
        <>
          <Divider />
          <Button danger icon={<InboxOutlined />} onClick={() => modal.confirm({
            title: `Archive ${flat.name}?`, okText: "Archive", okButtonProps: { danger: true },
            content: "Its apartments are archived too. Occupied or reserved apartments must be freed first.",
            onOk: () => archive.mutateAsync(),
          })}>Archive flat</Button>
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
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const unit = useQuery({ queryKey: ["unit", unitId], queryFn: () => api.unit(unitId) });
  const transitions = useAllowedTransitions(unit.data?.status);
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setUnitAmenities(unitId, ids),
    onSuccess: () => { message.success("Amenities saved"); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const archive = useMutation({
    mutationFn: () => (unit.data?.archivedAt ? api.restoreUnit(unitId) : api.archiveUnit(unitId)),
    onSuccess: (u) => { message.success(u.archivedAt ? "Apartment archived" : "Apartment restored"); invalidatePortfolio(queryClient); },
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
            {UNIT_TYPE_LABELS[u.type]} · {floorLabel(u.floor)}{u.buildingName ? ` · ${u.buildingName}` : ""}
          </Typography.Text>
        </div>
        <Link href={`/units/${u.id}`}><Button type="text" icon={<ExportOutlined />} aria-label="Open apartment page" /></Link>
      </Flex>
      <Flex gap={8} wrap style={{ marginBottom: 16 }}>
        {transitions.length > 0 && <Button type="primary" icon={<SwapOutlined />} onClick={() => setStatusOpen(true)}>Change status</Button>}
        {editable && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Edit</Button>}
      </Flex>
      <Flex gap={8} style={{ marginBottom: 20 }}>
        {[
          ["Rent", formatMoney(u.baseRent, u.currency)],
          ["Bed / bath", `${u.bedrooms} / ${u.bathrooms}`],
          ["Size", u.sizeSqm ? `${u.sizeSqm} m²` : "—"],
        ].map(([label, value]) => (
          <div key={label} style={{ flex: 1, padding: "8px 10px", background: "#f6f8f8", borderRadius: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
            <div style={{ fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </Flex>
      <Block title="Rooms">
        <RoomsEditor unitId={u.id} canEdit={editable} compact extra={source && source.rooms.length > 0 && (
          <Button icon={<CopyOutlined />} onClick={() => setCopyOpen(true)}>Copy to…</Button>
        )} />
      </Block>
      <Block title="Amenities">
        <AmenityEditor scope="UNIT" value={u.amenities} canEdit={editable} saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
        {flatAmenities && <Inherited label={`From ${flatAmenities.name}`} amenities={flatAmenities.amenities} />}
        <Inherited label="From the property" amenities={property.amenities} />
      </Block>
      <Block title={`Photos (${u.photos.length}/10)`}>
        <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={editable} onChanged={() => invalidatePortfolio(queryClient)} />
      </Block>
      {u.notes && <Block title="Notes"><Typography.Paragraph>{u.notes}</Typography.Paragraph></Block>}
      {editable && (
        <Button danger={!u.archivedAt} icon={u.archivedAt ? <UndoOutlined /> : <InboxOutlined />} disabled={!u.archivedAt && taken}
          title={taken ? "Occupied or reserved apartments cannot be archived" : undefined}
          onClick={() => (u.archivedAt ? archive.mutate() : modal.confirm({
            title: `Archive apartment ${u.unitNumber}?`, okText: "Archive", okButtonProps: { danger: true },
            content: "It will be hidden from lists and the drawing. You can restore it later.", onOk: () => archive.mutateAsync(),
          }))}>
          {u.archivedAt ? "Restore apartment" : "Archive apartment"}
        </Button>
      )}
      <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status} onClose={() => setStatusOpen(false)} />
      <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
      {source && <CopyRoomsModal open={copyOpen} source={source} structure={structure} onClose={() => setCopyOpen(false)} />}
    </>
  );
}
