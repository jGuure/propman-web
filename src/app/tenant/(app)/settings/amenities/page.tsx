"use client";

import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { errorMessage } from "@/lib/api/errors";
import type { Amenity, AmenityScope } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { AMENITY_SCOPE_LABELS } from "@/lib/labels";
import { useAmenities, usePortfolioPermissions } from "@/lib/portfolio-hooks";

export default function AmenitiesPage() {
  const { api } = useTenant();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canManageAmenities } = usePortfolioPermissions();
  const amenities = useAmenities();
  const [modal, setModal] = useState<{ open: boolean; amenity?: Amenity }>({ open: false });
  const [form] = Form.useForm<{ name: string; scope: AmenityScope }>();

  useEffect(() => {
    if (modal.open) {
      form.resetFields();
      form.setFieldsValue(modal.amenity ?? { scope: "BOTH" });
    }
  }, [modal, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["amenities"] });
  const save = useMutation({
    mutationFn: (v: { name: string; scope: AmenityScope }) =>
      modal.amenity ? api.updateAmenity(modal.amenity.id, v) : api.createAmenity(v),
    onSuccess: (a) => { message.success(`${a.name} saved`); refresh(); setModal({ open: false }); },
    onError: (error) => { if (!applyFieldErrors(form, error)) message.error(errorMessage(error)); },
  });
  const remove = useMutation({
    mutationFn: (a: Amenity) => api.deleteAmenity(a.id),
    onSuccess: () => { message.success("Amenity deleted"); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <>
      <PageHeader title="Amenities" description="Features you can give properties, flats and apartments."
        extra={canManageAmenities && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>Add amenity</Button>} />
      <Card>
        <Table<Amenity> rowKey="id" dataSource={amenities.data} loading={amenities.isFetching} pagination={false}
          scroll={{ x: 500 }}
          columns={[
            {
              title: "Name", dataIndex: "name", render: (name: string, a) => (
                <Space>{name}{a.system && <Tag icon={<LockOutlined />}>Built-in</Tag>}</Space>
              ),
            },
            { title: "Used for", dataIndex: "scope", render: (s: AmenityScope) => AMENITY_SCOPE_LABELS[s] },
            { title: "In use", dataIndex: "usageCount", align: "right", render: (n?: number | null) => n ?? 0 },
            ...(canManageAmenities ? [{
              key: "actions", align: "right" as const, width: 110, render: (_: unknown, a: Amenity) => a.system
                ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>Read-only</Typography.Text>
                : (
                  <Space>
                    <Button type="text" icon={<EditOutlined />} aria-label={`Edit ${a.name}`} onClick={() => setModal({ open: true, amenity: a })} />
                    <Tooltip title={a.usageCount ? "Remove it from properties and units first" : undefined}>
                      <Popconfirm title={`Delete ${a.name}?`} okText="Delete" okButtonProps={{ danger: true }}
                        disabled={!!a.usageCount} onConfirm={() => remove.mutate(a)}>
                        <Button type="text" danger icon={<DeleteOutlined />} disabled={!!a.usageCount} aria-label={`Delete ${a.name}`} />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                ),
            }] : []),
          ]} />
      </Card>
      <Modal open={modal.open} title={modal.amenity ? "Edit amenity" : "Add amenity"} onCancel={() => setModal({ open: false })}
        onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }, { max: 60 }]}>
            <Input autoFocus placeholder="Swimming pool" />
          </Form.Item>
          <Form.Item name="scope" label="Used for" rules={[{ required: true }]}>
            <Select options={(Object.keys(AMENITY_SCOPE_LABELS) as AmenityScope[]).map((s) => ({ value: s, label: AMENITY_SCOPE_LABELS[s] }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
