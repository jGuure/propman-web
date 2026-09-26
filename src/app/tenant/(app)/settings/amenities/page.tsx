"use client";

import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Amenity, AmenityScope } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { AMENITY_SCOPES, useLabels } from "@/lib/labels";
import { useAmenities, usePortfolioPermissions } from "@/lib/portfolio-hooks";

export default function AmenitiesPage() {
  const { api } = useTenant();
  const { t } = useT();
  const labels = useLabels();
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
    onSuccess: (a) => { message.success(t("amenities.saved", { name: a.name })); refresh(); setModal({ open: false }); },
    onError: (error) => { if (!applyFieldErrors(form, error)) message.error(errorMessage(error)); },
  });
  const remove = useMutation({
    mutationFn: (a: Amenity) => api.deleteAmenity(a.id),
    onSuccess: () => { message.success(t("amenities.deleted")); refresh(); },
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <>
      <PageHeader title={t("amenities.title")} description={t("amenities.subtitle")}
        extra={canManageAmenities && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>{t("amenities.add")}</Button>} />
      <Card>
        <Table<Amenity> rowKey="id" dataSource={amenities.data} loading={amenities.isFetching} pagination={false}
          scroll={{ x: 500 }}
          columns={[
            {
              title: t("common.name"), dataIndex: "name", render: (name: string, a) => (
                <Space>{name}{a.system && <Tag icon={<LockOutlined />}>{t("amenities.builtIn")}</Tag>}</Space>
              ),
            },
            { title: t("amenities.usedFor"), dataIndex: "scope", render: (s: AmenityScope) => labels.amenityScope(s) },
            { title: t("amenities.inUse"), dataIndex: "usageCount", align: "right", render: (n?: number | null) => n ?? 0 },
            ...(canManageAmenities ? [{
              key: "actions", align: "right" as const, width: 110, render: (_: unknown, a: Amenity) => a.system
                ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t("amenities.readOnly")}</Typography.Text>
                : (
                  <Space>
                    <Button type="text" icon={<EditOutlined />} aria-label={`${t("common.edit")} ${a.name}`} onClick={() => setModal({ open: true, amenity: a })} />
                    <Tooltip title={a.usageCount ? t("amenities.removeFirst") : undefined}>
                      <Popconfirm title={t("amenities.deleteConfirm", { name: a.name })} okText={t("common.delete")} okButtonProps={{ danger: true }}
                        disabled={!!a.usageCount} onConfirm={() => remove.mutate(a)}>
                        <Button type="text" danger icon={<DeleteOutlined />} disabled={!!a.usageCount} aria-label={`${t("common.delete")} ${a.name}`} />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                ),
            }] : []),
          ]} />
      </Card>
      <Modal open={modal.open} title={modal.amenity ? t("amenities.edit") : t("amenities.add")} onCancel={() => setModal({ open: false })}
        onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
          <Form.Item name="name" label={t("common.name")} rules={[{ required: true, whitespace: true, message: t("validation.enterName") }, { max: 60 }]}>
            <Input autoFocus placeholder={t("amenities.placeholder")} />
          </Form.Item>
          <Form.Item name="scope" label={t("amenities.usedFor")} rules={[{ required: true }]}>
            <Select options={AMENITY_SCOPES.map((s) => ({ value: s, label: labels.amenityScope(s) }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
