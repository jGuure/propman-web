"use client";

import { EditOutlined, InboxOutlined, SwapOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Descriptions, Flex, Skeleton, Space, Tabs, Timeline, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { StatusChange } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDateTime, formatMoney, fromNow } from "@/lib/format";
import { floorLabel, UNIT_STATUS_BAR, UNIT_STATUS_LABELS, UNIT_TYPE_LABELS } from "@/lib/labels";
import { useAllowedTransitions, usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { AmenityEditor } from "./AmenityEditor";
import { ChangeStatusModal } from "./ChangeStatusModal";
import { invalidatePortfolio } from "./invalidate";
import { PhotoGallery } from "./PhotoGallery";
import { UnitStatusTag } from "./tags";
import { UnitFormDrawer } from "./UnitFormDrawer";

/** Everything about one unit; shown in the unit drawer and on the unit page. */
export function UnitDetailsView({ unitId, compact = false }: { unitId: string; compact?: boolean }) {
  const { api } = useTenant();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManage } = usePortfolioPermissions();
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
    onSuccess: () => { message.success("Amenities saved"); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });
  const archive = useMutation({
    mutationFn: () => (unit.data?.archivedAt ? api.restoreUnit(unitId) : api.archiveUnit(unitId)),
    onSuccess: (u) => { message.success(u.archivedAt ? "Unit archived" : "Unit restored"); refresh(); },
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
      <Descriptions.Item label="Property"><Link href={`/properties/${u.propertyId}`}>{u.propertyName}</Link></Descriptions.Item>
      <Descriptions.Item label="Building">{u.buildingName ?? "—"}</Descriptions.Item>
      <Descriptions.Item label="Floor">{floorLabel(u.floor)}</Descriptions.Item>
      <Descriptions.Item label="Type">{UNIT_TYPE_LABELS[u.type]}</Descriptions.Item>
      <Descriptions.Item label="Bedrooms / bathrooms">{u.bedrooms} / {u.bathrooms}</Descriptions.Item>
      <Descriptions.Item label="Size">{u.sizeSqm ? `${u.sizeSqm} m²` : "—"}</Descriptions.Item>
      <Descriptions.Item label="Furnished">{u.furnished ? "Yes" : "No"}</Descriptions.Item>
      <Descriptions.Item label="Monthly rent"><Typography.Text strong>{formatMoney(u.baseRent, u.currency)}</Typography.Text></Descriptions.Item>
      <Descriptions.Item label="Deposit">{formatMoney(u.depositAmount, u.currency)}</Descriptions.Item>
      <Descriptions.Item label="Added">{formatDateTime(u.createdAt)}</Descriptions.Item>
      {u.notes && <Descriptions.Item label="Notes" span="filled">{u.notes}</Descriptions.Item>}
    </Descriptions>
  );
  const timeline = (
    <Timeline items={changes.map((c) => ({
      color: UNIT_STATUS_BAR[c.toStatus],
      content: (
        <div>
          <Typography.Text strong>
            {c.fromStatus ? `${UNIT_STATUS_LABELS[c.fromStatus]} → ${UNIT_STATUS_LABELS[c.toStatus]}` : `Created as ${UNIT_STATUS_LABELS[c.toStatus].toLowerCase()}`}
          </Typography.Text>
          {c.reason && <div><Typography.Text type="secondary">{c.reason}</Typography.Text></div>}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {fromNow(c.changedAt)} · {c.changedByName ?? (c.source === "MANUAL" ? "Unknown user" : "System")}
          </Typography.Text>
        </div>
      ),
    }))} />
  );

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Typography.Title level={compact ? 4 : 3} style={{ margin: 0 }}>Unit {u.unitNumber}</Typography.Title>
          {archived ? <Typography.Text type="secondary">Archived</Typography.Text> : <UnitStatusTag status={u.status} />}
        </Space>
        <Space wrap>
          {!archived && transitions.length > 0 && (
            <Button icon={<SwapOutlined />} onClick={() => setStatusOpen(true)}>Change status</Button>
          )}
          {!archived && canManage && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Edit</Button>}
          {canManage && (archived ? (
            <Button icon={<UndoOutlined />} loading={archive.isPending} onClick={() => archive.mutate()}>Restore</Button>
          ) : (
            <Button icon={<InboxOutlined />} danger disabled={taken} title={taken ? "Occupied or reserved units cannot be archived" : undefined}
              onClick={() => modal.confirm({
                title: `Archive unit ${u.unitNumber}?`, okText: "Archive", okButtonProps: { danger: true },
                content: "It will be hidden from lists and the grid. You can restore it later.",
                onOk: () => archive.mutateAsync(),
              })}>Archive</Button>
          ))}
        </Space>
      </Flex>
      {compact ? (
        <Tabs items={[
          { key: "details", label: "Details", children: details },
          {
            key: "amenities", label: "Amenities", children: (
              <AmenityEditor scope="UNIT" value={u.amenities} canEdit={canManage && !archived}
                saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
            ),
          },
          {
            key: "photos", label: `Photos (${u.photos.length})`, children: (
              <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={canManage && !archived}
                onChanged={refresh} />
            ),
          },
          { key: "history", label: "Status history", children: timeline },
        ]} />
      ) : (
        <Flex vertical gap={16}>
          <Card title="Details">{details}</Card>
          <Card title="Amenities">
            <AmenityEditor scope="UNIT" value={u.amenities} canEdit={canManage && !archived}
              saving={amenities.isPending} onSave={(ids) => amenities.mutate(ids)} />
          </Card>
          <Card title="Photos">
            <PhotoGallery owner="units" ownerId={u.id} photos={u.photos} max={10} canEdit={canManage && !archived}
              onChanged={refresh} />
          </Card>
          <Card title="Status history">{timeline}</Card>
        </Flex>
      )}
      <UnitFormDrawer open={editOpen} unit={u} onClose={() => setEditOpen(false)} />
      <ChangeStatusModal open={statusOpen} unitId={u.id} unitNumber={u.unitNumber} status={u.status}
        onClose={() => setStatusOpen(false)} />
    </div>
  );
}
