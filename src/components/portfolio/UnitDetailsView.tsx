"use client";

import { EditOutlined, InboxOutlined, MoreOutlined, SwapOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Descriptions, Dropdown, Flex, Row, Skeleton, Space, Tabs, Tag, Timeline, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { RoomType, StatusChange } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDateTime, formatMoney, fromNow } from "@/lib/format";
import { UNIT_STATUS_BAR, useLabels } from "@/lib/labels";
import { useAllowedTransitions, usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { TenancySection } from "@/components/leases/TenancySection";
import { AmenityEditor } from "./AmenityEditor";
import { BedroomWarning } from "./BedroomWarning";
import { Block, PhotoStrip, ShortText } from "./explorer/Inspector";
import { ChangeStatusModal } from "./ChangeStatusModal";
import { invalidatePortfolio } from "./invalidate";
import { PhotoGallery } from "./PhotoGallery";
import { RoomsEditor } from "./RoomsEditor";
import { UnitStatusTag } from "./tags";
import { UnitFormDrawer } from "./UnitFormDrawer";

/** Everything about one unit; shown in the unit drawer and on the unit page. */
export function UnitDetailsView({ unitId, compact = false }: { unitId: string; compact?: boolean }) {
  const { api } = useTenant();
  const { t } = useT();
  const labels = useLabels();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManage, canReadLeases } = usePortfolioPermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [addRequest, setAddRequest] = useState<{ type: RoomType; at: number }>();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const unit = useQuery({ queryKey: ["unit", unitId], queryFn: () => api.unit(unitId) });
  const history = useQuery({
    queryKey: ["unit-history", unitId],
    queryFn: () => api.unitStatusHistory(unitId, 0, 50),
    enabled: !compact,
  });
  const transitions = useAllowedTransitions(unit.data?.status);

  const refresh = () => invalidatePortfolio(queryClient);
  const amenities = useMutation({
    mutationFn: (ids: string[]) => api.setUnitAmenities(unitId, ids),
    onSuccess: () => { message.success(t("explorer.amenitiesSaved")); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const archive = useMutation({
    mutationFn: () => (unit.data?.archivedAt ? api.restoreUnit(unitId) : api.archiveUnit(unitId)),
    onSuccess: (u) => { message.success(t(u.archivedAt ? "explorer.apartmentArchived" : "explorer.apartmentRestored")); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (unit.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  if (unit.error) {
    return <Alert type="error" showIcon title={errorMessage(unit.error)} />;
  }
  const u = unit.data;
  const archived = !!u.archivedAt;
  const changes: StatusChange[] = compact ? u.recentStatusChanges : history.data?.content ?? u.recentStatusChanges;
  const taken = u.status === "OCCUPIED" || u.status === "RESERVED";

  const details = (
    <Descriptions column={compact ? 1 : { xs: 1, md: 2 }} size="small" bordered>
      <Descriptions.Item label={t("apartments.property")}><Link href={`/properties/${u.propertyId}`}>{u.propertyName}</Link></Descriptions.Item>
      <Descriptions.Item label={t("apartments.flat")}>{u.buildingName ?? "—"}</Descriptions.Item>
      <Descriptions.Item label={t("apartments.floor")}>{labels.floor(u.floor)}</Descriptions.Item>
      <Descriptions.Item label={t("common.type")}>{labels.unitType(u.type)}</Descriptions.Item>
      <Descriptions.Item label={t("apartments.bedsBaths")}>{u.bedrooms} / {u.bathrooms}</Descriptions.Item>
      <Descriptions.Item label={t("common.size")}>{u.sizeSqm ? `${u.sizeSqm} m²` : "—"}</Descriptions.Item>
      <Descriptions.Item label={t("apartments.furnished")}>{u.furnished ? t("common.yes") : t("common.no")}</Descriptions.Item>
      <Descriptions.Item label={t("common.monthlyRent")}><Typography.Text strong>{formatMoney(u.baseRent)}</Typography.Text></Descriptions.Item>
      <Descriptions.Item label={t("common.deposit")}>{formatMoney(u.depositAmount)}</Descriptions.Item>
      <Descriptions.Item label={t("common.added")}>{formatDateTime(u.createdAt)}</Descriptions.Item>
      {u.notes && <Descriptions.Item label={t("common.notes")} span="filled">{u.notes}</Descriptions.Item>}
    </Descriptions>
  );
  const roomsBlock = (
    <>
      <BedroomWarning type={u.type} rooms={u.rooms} canEdit={canManage && !archived}
        onAddBedroom={() => setAddRequest({ type: "BEDROOM", at: Date.now() })} onChangeType={() => setEditOpen(true)} />
      <RoomsEditor unitId={u.id} canEdit={canManage && !archived} addRequest={addRequest} />
    </>
  );
  const timelineItem = (c: StatusChange) => ({
    color: UNIT_STATUS_BAR[c.toStatus],
    content: (
      <div>
        <Typography.Text strong>
          {c.fromStatus ? `${labels.unitStatus(c.fromStatus)} → ${labels.unitStatus(c.toStatus)}` : t("apartments.createdAs", { status: labels.unitStatus(c.toStatus).toLowerCase() })}
        </Typography.Text>
        {c.reason && <div><Typography.Text type="secondary">{c.reason}</Typography.Text></div>}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {fromNow(c.changedAt)} · {c.changedByName ?? (c.source === "MANUAL" ? t("apartments.unknownUser") : t("apartments.system"))}
        </Typography.Text>
      </div>
    ),
  });
  const timeline = <Timeline items={changes.map(timelineItem)} />;

  const canEdit = canManage && !archived;
  const statusButton = !archived && transitions.length > 0 && u.openLeases.length === 0 && (
    <Button icon={<SwapOutlined />} onClick={() => setStatusOpen(true)}>{t("explorer.changeStatus")}</Button>
  );
  const archiveItem: MenuProps["items"] = canManage ? [archived
    ? { key: "restore", icon: <UndoOutlined />, label: t("common.restore"), onClick: () => archive.mutate() }
    : {
      key: "archive", icon: <InboxOutlined />, danger: true, disabled: taken, label: t("explorer.archiveApartment"),
      title: taken ? t("explorer.cannotArchiveTaken") : undefined,
      onClick: () => modal.confirm({
        title: t("explorer.archiveApartmentTitle", { number: u.unitNumber }), okText: t("common.archive"),
        okButtonProps: { danger: true }, content: t("explorer.archiveApartmentText"), onOk: () => archive.mutateAsync(),
      }),
    }] : [];

  if (compact) {
    return (
      <div>
        <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
          <Space size="middle" align="center">
            <Typography.Title level={4} style={{ margin: 0 }}>{t("explorer.apartment", { number: u.unitNumber })}</Typography.Title>
            {archived ? <Typography.Text type="secondary">{t("common.archived")}</Typography.Text> : <UnitStatusTag status={u.status} />}
          </Space>
          <Space wrap>
            {statusButton}
            {canEdit && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
            {archiveItem.length > 0 && (
              <Dropdown menu={{ items: archiveItem }} trigger={["click"]}>
                <Button icon={<MoreOutlined />} aria-label={t("explorer.moreActions")} />
              </Dropdown>
            )}
          </Space>
        </Flex>
        <Tabs items={[
          ...(canReadLeases ? [{ key: "tenancy", label: t("leases.tenancy"), children: <TenancySection unit={u} /> }] : []),
          { key: "details", label: t("apartments.details"), children: details },
          { key: "rooms", label: `${t("apartments.rooms")} (${u.rooms.length})`, children: roomsBlock },
          {
            key: "amenities", label: t("apartments.amenities"), children: (
              <AmenityEditor scope="UNIT" value={u.amenities} canEdit={canEdit}
                saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
            ),
          },
          {
            key: "photos", label: t("apartments.photos", { count: u.photos.length }), children: (
              <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={canEdit} onChanged={refresh} />
            ),
          },
          { key: "history", label: t("apartments.statusHistory"), children: timeline },
        ]} />
        <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
        <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status}
          onClose={() => setStatusOpen(false)} />
      </div>
    );
  }

  const stats: [string, string][] = [
    [t("common.monthlyRent"), formatMoney(u.baseRent)],
    [t("common.deposit"), formatMoney(u.depositAmount)],
    [t("explorer.bedBath"), `${u.bedrooms} / ${u.bathrooms}`],
    [t("common.size"), u.sizeSqm ? `${u.sizeSqm} m²` : "—"],
    [t("apartments.furnished"), u.furnished ? t("common.yes") : t("common.no")],
  ];
  const shownChanges = showAllHistory ? changes : changes.slice(0, 5);

  return (
    <div>
      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Space size="middle" align="center">
            <Typography.Title level={3} style={{ margin: 0 }}>{t("explorer.apartment", { number: u.unitNumber })}</Typography.Title>
            {archived ? <Tag>{t("common.archived")}</Tag> : <UnitStatusTag status={u.status} />}
          </Space>
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 2 }}>
            {labels.unitType(u.type)} · {labels.floor(u.floor)}{u.buildingName ? ` · ${u.buildingName}` : ""} ·{" "}
            <Link href={`/properties/${u.propertyId}`}>{u.propertyName}</Link>
          </Typography.Text>
        </div>
        <Space wrap>
          {statusButton}
          {canEdit && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
          {archiveItem.length > 0 && (
            <Dropdown menu={{ items: archiveItem }} trigger={["click"]}>
              <Button icon={<MoreOutlined />} aria-label={t("explorer.moreActions")} />
            </Dropdown>
          )}
        </Space>
      </Flex>

      <Flex gap={8} wrap style={{ marginBottom: 16 }}>
        {stats.map(([label, value]) => (
          <div key={label} style={{ flex: "1 1 120px", padding: "8px 12px", background: "#fff", border: "1px solid #eef0f0", borderRadius: 10 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{value}</div>
          </div>
        ))}
      </Flex>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} lg={15}>
          <Flex vertical gap={16}>
            {canReadLeases && (
              <Card size="small" title={t("leases.tenancy")}>
                <TenancySection unit={u} />
              </Card>
            )}
            <Card size="small" title={t("apartments.rooms")}>
              <BedroomWarning type={u.type} rooms={u.rooms} canEdit={canEdit}
                onAddBedroom={() => setAddRequest({ type: "BEDROOM", at: Date.now() })} onChangeType={() => setEditOpen(true)} />
              <RoomsEditor unitId={u.id} canEdit={canEdit} addRequest={addRequest} compact />
            </Card>
          </Flex>
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small">
            <Block title={t("explorer.about")}>
              <Descriptions column={1} size="small" colon={false}
                items={[
                  { key: "flat", label: t("apartments.flat"), children: u.buildingName ?? "—" },
                  { key: "floor", label: t("apartments.floor"), children: labels.floor(u.floor) },
                  { key: "type", label: t("common.type"), children: labels.unitType(u.type) },
                  { key: "added", label: t("common.added"), children: formatDateTime(u.createdAt) },
                ]} />
              {u.notes && <ShortText text={u.notes} />}
            </Block>
            <Block title={t("apartments.amenities")}>
              <AmenityEditor scope="UNIT" value={u.amenities} canEdit={canEdit}
                saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
            </Block>
            <PhotoStrip owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={canEdit}
              title={t("explorer.apartment", { number: u.unitNumber })} />
            <Block title={t("apartments.statusHistory")}
              extra={changes.length > 5 && (
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setShowAllHistory(!showAllHistory)}>
                  {showAllHistory ? t("explorer.showLess") : t("explorer.viewAll")}
                </Button>
              )}>
              <Timeline items={shownChanges.map(timelineItem)} />
            </Block>
          </Card>
        </Col>
      </Row>
      <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
      <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status}
        onClose={() => setStatusOpen(false)} />
    </div>
  );
}
