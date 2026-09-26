"use client";

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { Room, RoomRequest, RoomType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { ROOM_TYPE_LABELS } from "@/lib/labels";
import { invalidatePortfolio } from "./invalidate";

const ROOM_OPTIONS = (Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((t) => ({ value: t, label: ROOM_TYPE_LABELS[t] }));

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
      message.success(`${room.name} saved`);
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
          {list.length} room{list.length === 1 ? "" : "s"}{totalSize > 0 ? ` · ${totalSize} m²` : ""}
        </Typography.Text>
        {canEdit && (
          <Space wrap>
            {extra}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ open: true })}>Add room</Button>
          </Space>
        )}
      </Flex>
      {compact ? (
        <Flex vertical gap={6}>
          {list.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rooms yet" />}
          {list.map((r, index) => (
            <Flex key={r.id} align="center" gap={8} style={{ padding: "6px 10px", border: "1px solid #eef0f0", borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong ellipsis style={{ display: "block" }}>{r.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {ROOM_TYPE_LABELS[r.type]}{r.sizeSqm ? ` · ${r.sizeSqm} m²` : ""}{r.notes ? ` · ${r.notes}` : ""}
                </Typography.Text>
              </div>
              {canEdit && (
                <Space size={0}>
                  <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} aria-label="Move up" onClick={() => move(index, -1)} />
                  <Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${r.name}`} onClick={() => setEditing({ open: true, room: r })} />
                  <Popconfirm title={`Delete ${r.name}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove.mutate(r)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${r.name}`} />
                  </Popconfirm>
                </Space>
              )}
            </Flex>
          ))}
        </Flex>
      ) : (
      <Table<Room> rowKey="id" size="small" pagination={false} loading={rooms.isFetching} dataSource={list}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rooms yet" /> }}
        columns={[
          { title: "Room", dataIndex: "name", render: (name: string, r) => <Space><Typography.Text strong>{name}</Typography.Text>{r.notes && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.notes}</Typography.Text>}</Space> },
          { title: "Type", dataIndex: "type", render: (t: RoomType) => <Tag>{ROOM_TYPE_LABELS[t]}</Tag> },
          { title: "Size", dataIndex: "sizeSqm", align: "right", width: 80, render: (s: number | null) => <span style={{ whiteSpace: "nowrap" }}>{s ? `${s} m²` : "—"}</span> },
          ...(canEdit ? [{
            key: "actions", align: "right" as const, width: 150, render: (_: unknown, r: Room, index: number) => (
              <Space size={0}>
                <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} aria-label="Move up" onClick={() => move(index, -1)} />
                <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === list.length - 1} aria-label="Move down" onClick={() => move(index, 1)} />
                <Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${r.name}`} onClick={() => setEditing({ open: true, room: r })} />
                <Popconfirm title={`Delete ${r.name}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove.mutate(r)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${r.name}`} />
                </Popconfirm>
              </Space>
            ),
          }] : []),
        ]} />
      )}
      <Modal open={editing.open} title={editing.room ? `Edit ${editing.room.name}` : "Add room"} destroyOnHidden
        onCancel={() => setEditing({ open: false })} onOk={() => form.submit()} confirmLoading={save.isPending}
        okText={editing.room ? "Save" : "Add room"} cancelText={editing.room ? "Cancel" : "Done"}>
        <Form<RoomRequest> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={ROOM_OPTIONS} onChange={(t: RoomType) => {
              if (!form.getFieldValue("name")) {
                form.setFieldValue("name", ROOM_TYPE_LABELS[t]);
              }
            }} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }, { max: 60 }]}>
            <Input placeholder="Bedroom 1" autoFocus />
          </Form.Item>
          <Form.Item name="sizeSqm" label="Size (m²)">
            <InputNumber min={0.5} max={9999} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes" rules={[{ max: 255 }]}
            extra={editing.room ? undefined : "After adding, the form stays open so you can add the next room."}>
            <Input placeholder="Built-in wardrobe, en-suite…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
