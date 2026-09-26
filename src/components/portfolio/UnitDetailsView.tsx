"use client";

import { EditOutlined, InboxOutlined, SwapOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Descriptions, Flex, Skeleton, Space, Tabs, Timeline, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { StatusChange } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDateTime, formatMoney, fromNow } from "@/lib/format";
import { UNIT_STATUS_BAR, useLabels } from "@/lib/labels";
import { useAllowedTransitions, usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { TenancySection } from "@/components/leases/TenancySection";
import { AmenityEditor } from "./AmenityEditor";
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
  const timeline = (
    <Timeline items={changes.map((c) => ({
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
    }))} />
  );

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Typography.Title level={compact ? 4 : 3} style={{ margin: 0 }}>{t("explorer.apartment", { number: u.unitNumber })}</Typography.Title>
          {archived ? <Typography.Text type="secondary">{t("common.archived")}</Typography.Text> : <UnitStatusTag status={u.status} />}
        </Space>
        <Space wrap>
          {!archived && transitions.length > 0 && u.openLeases.length === 0 && (
            <Button icon={<SwapOutlined />} onClick={() => setStatusOpen(true)}>{t("explorer.changeStatus")}</Button>
          )}
          {!archived && canManage && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
          {canManage && (archived ? (
            <Button icon={<UndoOutlined />} loading={archive.isPending} onClick={() => archive.mutate()}>{t("common.restore")}</Button>
          ) : (
            <Button icon={<InboxOutlined />} danger disabled={taken} title={taken ? t("explorer.cannotArchiveTaken") : undefined}
              onClick={() => modal.confirm({
                title: t("explorer.archiveApartmentTitle", { number: u.unitNumber }), okText: t("common.archive"), okButtonProps: { danger: true },
                content: t("explorer.archiveApartmentText"),
                onOk: () => archive.mutateAsync(),
              })}>{t("common.archive")}</Button>
          ))}
        </Space>
      </Flex>
      {compact ? (
        <Tabs items={[
          ...(canReadLeases ? [{ key: "tenancy", label: t("leases.tenancy"), children: <TenancySection unit={u} /> }] : []),
          { key: "details", label: t("apartments.details"), children: details },
          {
            key: "rooms", label: `${t("apartments.rooms")} (${u.rooms.length})`, children: <RoomsEditor unitId={u.id} canEdit={canManage && !archived} />,
          },
          {
            key: "amenities", label: t("apartments.amenities"), children: (
              <AmenityEditor scope="UNIT" value={u.amenities} canEdit={canManage && !archived}
                saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
            ),
          },
          {
            key: "photos", label: t("apartments.photos", { count: u.photos.length }), children: (
              <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={canManage && !archived}
                onChanged={refresh} />
            ),
          },
          { key: "history", label: t("apartments.statusHistory"), children: timeline },
        ]} />
      ) : (
        <Flex vertical gap={16}>
          {canReadLeases && <Card title={t("leases.tenancy")}><TenancySection unit={u} /></Card>}
          <Card title={t("apartments.details")}>{details}</Card>
          <Card title={t("apartments.rooms")}><RoomsEditor unitId={u.id} canEdit={canManage && !archived} /></Card>
          <Card title={t("apartments.amenities")}>
            <AmenityEditor scope="UNIT" value={u.amenities} canEdit={canManage && !archived}
              saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
          </Card>
          <Card title={t("apartments.photos", { count: u.photos.length })}>
            <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={canManage && !archived}
              onChanged={refresh} />
          </Card>
          <Card title={t("apartments.statusHistory")}>{timeline}</Card>
        </Flex>
      )}
      <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
      <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status}
        onClose={() => setStatusOpen(false)} />
    </div>
  );
}
