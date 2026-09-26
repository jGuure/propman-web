"use client";

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Room, RoomRequest, RoomType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { ROOM_TYPES, useLabels } from "@/lib/labels";
import { invalidatePortfolio } from "./invalidate";

interface Props {
  unitId: string;
  canEdit: boolean;
  /** Extra buttons next to "Add room" (e.g. copy layout). */
  extra?: React.ReactNode;
  /** List layout for narrow places such as the side panel. */
  compact?: boolean;
}

/** The rooms of one apartment. Bedroom and bathroom counts of the apartment follow its rooms. */
export function RoomsEditor({ unitId, canEdit, extra, compact = false }: Props) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const labels = useLabels();
  const roomOptions = ROOM_TYPES.map((type) => ({ value: type, label: labels.roomType(type) }));
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ open: boolean; room?: Room }>({ open: false });
  const [form] = Form.useForm<RoomRequest>();
  const rooms = useQuery({ queryKey: ["rooms", unitId], queryFn: () => api.rooms(unitId) });

  useEffect(() => {
    if (editing.open) {
      form.resetFields();
      form.setFieldsValue(editing.room ?? { type: "BEDROOM" });
    }
  }, [editing, form]);

  const refresh = () => invalidatePortfolio(queryClient);
  const save = useMutation({
    mutationFn: (v: RoomRequest) => (editing.room ? api.updateRoom(editing.room.id, v) : api.addRoom(unitId, v)),
    onSuccess: (room) => {
      message.success(t("rooms.saved", { name: room.name }));
      refresh();
      if (editing.room) {
        setEditing({ open: false });
      } else {
        form.resetFields();
        form.setFieldsValue({ type: room.type });
      }
    },
    onError: (error) => { if (!applyFieldErrors(form, error)) message.error(errorMessage(error)); },
  });
  const remove = useMutation({
    mutationFn: (room: Room) => api.deleteRoom(room.id),
    onSuccess: refresh,
    onError: (error) => message.error(errorMessage(error)),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.reorderRooms(unitId, ids),
    onSuccess: refresh,
    onError: (error) => message.error(errorMessage(error)),
  });

  const list = rooms.data ?? [];
  const move = (index: number, delta: number) => {
    const ids = list.map((r) => r.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  };
  const totalSize = list.reduce((sum, r) => sum + (r.sizeSqm ?? 0), 0);

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">
          {tn("count.rooms", list.length)}{totalSize > 0 ? ` · ${totalSize} m²` : ""}
        </Typography.Text>
        {canEdit && (
          <Space wrap>
            {extra}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ open: true })}>{t("rooms.add")}</Button>
          </Space>
        )}
      </Flex>
      {compact ? (
        <Flex vertical gap={6}>
          {list.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("rooms.none")} />}
          {list.map((r, index) => (
            <Flex key={r.id} align="center" gap={8} style={{ padding: "6px 10px", border: "1px solid #eef0f0", borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong ellipsis style={{ display: "block" }}>{r.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {labels.roomType(r.type)}{r.sizeSqm ? ` · ${r.sizeSqm} m²` : ""}{r.notes ? ` · ${r.notes}` : ""}
                </Typography.Text>
              </div>
              {canEdit && (
                <Space size={0}>
                  <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} aria-label={t("common.moveUp")} onClick={() => move(index, -1)} />
                  <Button type="text" size="small" icon={<EditOutlined />} aria-label={t("rooms.editTitle", { name: r.name })} onClick={() => setEditing({ open: true, room: r })} />
                  <Popconfirm title={t("rooms.deleteConfirm", { name: r.name })} okText={t("common.delete")} okButtonProps={{ danger: true }} onConfirm={() => remove.mutate(r)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`${t("common.delete")} ${r.name}`} />
                  </Popconfirm>
                </Space>
              )}
            </Flex>
          ))}
        </Flex>
      ) : (
      <Table<Room> rowKey="id" size="small" pagination={false} loading={rooms.isFetching} dataSource={list}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("rooms.none")} /> }}
        columns={[
          { title: t("rooms.room"), dataIndex: "name", render: (name: string, r) => <Space><Typography.Text strong>{name}</Typography.Text>{r.notes && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.notes}</Typography.Text>}</Space> },
          { title: t("common.type"), dataIndex: "type", render: (type: RoomType) => <Tag>{labels.roomType(type)}</Tag> },
          { title: t("common.size"), dataIndex: "sizeSqm", align: "right", width: 80, render: (s: number | null) => <span style={{ whiteSpace: "nowrap" }}>{s ? `${s} m²` : "—"}</span> },
          ...(canEdit ? [{
            key: "actions", align: "right" as const, width: 150, render: (_: unknown, r: Room, index: number) => (
              <Space size={0}>
                <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} aria-label={t("common.moveUp")} onClick={() => move(index, -1)} />
                <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === list.length - 1} aria-label={t("common.moveDown")} onClick={() => move(index, 1)} />
                <Button type="text" size="small" icon={<EditOutlined />} aria-label={t("rooms.editTitle", { name: r.name })} onClick={() => setEditing({ open: true, room: r })} />
                <Popconfirm title={t("rooms.deleteConfirm", { name: r.name })} okText={t("common.delete")} okButtonProps={{ danger: true }} onConfirm={() => remove.mutate(r)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`${t("common.delete")} ${r.name}`} />
                </Popconfirm>
              </Space>
            ),
          }] : []),
        ]} />
      )}
      <Modal open={editing.open} title={editing.room ? t("rooms.editTitle", { name: editing.room.name }) : t("rooms.add")} destroyOnHidden
        onCancel={() => setEditing({ open: false })} onOk={() => form.submit()} confirmLoading={save.isPending}
        okText={editing.room ? t("common.save") : t("rooms.add")} cancelText={editing.room ? t("common.cancel") : t("common.done")}>
        <Form<RoomRequest> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
          <Form.Item name="type" label={t("common.type")} rules={[{ required: true }]}>
            <Select options={roomOptions} onChange={(type: RoomType) => {
              if (!form.getFieldValue("name")) {
                form.setFieldValue("name", labels.roomType(type));
              }
            }} />
          </Form.Item>
          <Form.Item name="name" label={t("common.name")} rules={[{ required: true, whitespace: true, message: t("validation.enterName") }, { max: 60 }]}>
            <Input placeholder={t("rooms.namePlaceholder")} autoFocus />
          </Form.Item>
          <Form.Item name="sizeSqm" label={t("common.sizeSqm")}>
            <InputNumber min={0.5} max={9999} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label={t("common.notes")} rules={[{ max: 255 }]}
            extra={editing.room ? undefined : t("rooms.stayOpen")}>
            <Input placeholder={t("rooms.notesPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
