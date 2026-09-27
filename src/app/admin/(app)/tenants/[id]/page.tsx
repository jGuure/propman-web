"use client";

import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, ExportOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Descriptions, Form, Input, Modal, Skeleton, Space } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useReviewActions } from "@/components/admin/review-actions";
import { PageHeader } from "@/components/PageHeader";
import { TenantStatusTag } from "@/components/tags";
import { errorMessage } from "@/lib/api/errors";
import type { TenantDetails } from "@/lib/api/types";
import { usePlatform } from "@/lib/auth/platform-context";
import { formatDateTime } from "@/lib/format";

export default function TenantDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = usePlatform();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [form] = Form.useForm<{ reason: string }>();
  const tenant = useQuery({ queryKey: ["platform-tenant", id], queryFn: () => api.tenant(id) });
  const router = useRouter();

  const onChanged = (updated: TenantDetails) => {
    queryClient.setQueryData(["platform-tenant", id], updated);
    queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
  };
  const suspend = useMutation({
    mutationFn: (reason: string) => api.suspend(id, reason),
    onSuccess: (updated) => {
      onChanged(updated);
      setSuspendOpen(false);
      message.success(`${updated.name} is suspended`);
    },
    onError: (error) => message.error(errorMessage(error)),
  });
  const activate = useMutation({
    mutationFn: () => api.activate(id),
    onSuccess: (updated) => {
      onChanged(updated);
      message.success(`${updated.name} is active again`);
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const review = useReviewActions({
    onApproved: (updated) => queryClient.setQueryData(["platform-tenant", id], updated),
    onRejected: () => router.push("/tenants"),
  });

  if (tenant.isPending) {
    return <Card><Skeleton active /></Card>;
  }
  if (tenant.error) {
    return <Alert type="error" showIcon title={errorMessage(tenant.error)} />;
  }
  const t = tenant.data;

  return (
    <>
      <Link href="/tenants"><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0 }}>All tenants</Button></Link>
      <PageHeader title={t.name} description={<TenantStatusTag status={t.status} />}
        extra={
          <Space wrap>
            <Button icon={<ExportOutlined />} href={t.url} target="_blank">Open</Button>
            {t.status === "PENDING_REVIEW" && (
              <>
                <Button type="primary" icon={<CheckOutlined />} disabled={review.busy} onClick={() => review.approve(t)}>Approve</Button>
                <Button danger icon={<CloseOutlined />} disabled={review.busy} onClick={() => review.reject(t)}>Reject</Button>
              </>
            )}
            {t.status === "ACTIVE" && (
              <Button danger onClick={() => { form.resetFields(); setSuspendOpen(true); }}>Suspend</Button>
            )}
            {t.status === "SUSPENDED" && (
              <Button type="primary" loading={activate.isPending} onClick={() => modal.confirm({
                title: `Activate ${t.name}?`, content: "Its users will be able to sign in again.",
                okText: "Activate", onOk: () => activate.mutateAsync(),
              })}>Activate</Button>
            )}
          </Space>
        } />
      {t.status === "PENDING_REVIEW" && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Waiting for review"
          description={`${t.source === "ADMIN" ? "Created by an admin" : "Registered on the website"} on ${formatDateTime(t.createdAt)}. Nobody can sign in until you approve it; rejecting deletes it with everything in it.`} />
      )}
      {t.status === "SUSPENDED" && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} title="Suspended"
          description={`${t.suspendedReason ?? "No reason given"} — since ${formatDateTime(t.suspendedAt)}`} />
      )}
      <Card>
        <Descriptions column={{ xs: 1, md: 2 }} bordered size="middle">
          <Descriptions.Item label="Address">{t.url}</Descriptions.Item>
          <Descriptions.Item label="Slug">{t.slug}</Descriptions.Item>
          <Descriptions.Item label="Email">{t.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{t.phone ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Country">{t.country}</Descriptions.Item>
          <Descriptions.Item label="Added by">{t.source === "ADMIN" ? "Platform admin" : "Website sign-up"}</Descriptions.Item>
          <Descriptions.Item label="Users">{t.userCount ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Database schema">{t.schemaName}</Descriptions.Item>
          <Descriptions.Item label="Registered">{formatDateTime(t.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Activated">{formatDateTime(t.activatedAt)}</Descriptions.Item>
          <Descriptions.Item label="Last change">{formatDateTime(t.updatedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Modal open={suspendOpen} title={`Suspend ${t.name}?`} okText="Suspend" okButtonProps={{ danger: true }}
        confirmLoading={suspend.isPending} onCancel={() => setSuspendOpen(false)} onOk={() => form.submit()}>
        <p>All users of this organization are locked out immediately, including anyone signed in right now.</p>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={({ reason }) => suspend.mutate(reason)}>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Give a reason" }, { max: 255 }]}>
            <Input.TextArea rows={3} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
