"use client";

import { CheckOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button, Card, Flex, Input, Select, Table, Tag, Typography, type TableProps } from "antd";
import Link from "next/link";
import { useState } from "react";
import { CreateTenantDrawer } from "@/components/admin/CreateTenantDrawer";
import { useReviewActions } from "@/components/admin/review-actions";
import { PageHeader } from "@/components/PageHeader";
import { TenantStatusTag } from "@/components/tags";
import { errorMessage } from "@/lib/api/errors";
import type { TenantListParams, TenantSource, TenantStatus, TenantSummary } from "@/lib/api/types";
import { usePlatform } from "@/lib/auth/platform-context";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUSES: TenantStatus[] = ["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "REJECTED", "PROVISIONING", "FAILED"];
const SOURCE_LABELS: Record<TenantSource, string> = { SIGNUP: "Website", ADMIN: "Admin" };

/** Organizations waiting for approval, with Approve / Reject right here. */
function ReviewQueue() {
  const { api } = usePlatform();
  const pending = useQuery({
    queryKey: ["platform-tenants", "pending"],
    queryFn: () => api.tenants({ page: 0, size: 50, status: "PENDING_REVIEW" }),
  });
  const { approve, reject, busy } = useReviewActions();
  const rows = pending.data?.content ?? [];
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card size="small" style={{ marginBottom: 16, borderColor: "#f3d98b", background: "#fffdf5" }}
      title={<Flex gap={8} align="center">Waiting for review <Tag color="gold">{pending.data?.totalElements}</Tag></Flex>}>
      <Flex vertical gap={8}>
        {rows.map((tenant) => (
          <Flex key={tenant.id} justify="space-between" align="center" gap={12} wrap
            style={{ padding: "8px 12px", background: "#fff", border: "1px solid #eef0f0", borderRadius: 8 }}>
            <div style={{ minWidth: 0 }}>
              <Link href={`/tenants/${tenant.id}`}><Typography.Text strong>{tenant.name}</Typography.Text></Link>
              <Typography.Text type="secondary" style={{ display: "block", fontSize: 13 }}>
                {tenant.slug} · {tenant.email} · {SOURCE_LABELS[tenant.source]} · {formatDateTime(tenant.createdAt)}
              </Typography.Text>
            </div>
            <Flex gap={6}>
              <Button size="small" type="primary" icon={<CheckOutlined />} disabled={busy} onClick={() => approve(tenant)}>Approve</Button>
              <Button size="small" danger icon={<CloseOutlined />} disabled={busy} onClick={() => reject(tenant)}>Reject</Button>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

export default function TenantsPage() {
  const { api } = usePlatform();
  const [params, setParams] = useState<TenantListParams>({ page: 0, size: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const tenants = useQuery({
    queryKey: ["platform-tenants", params],
    queryFn: () => api.tenants(params),
    placeholderData: keepPreviousData,
  });

  const columns: TableProps<TenantSummary>["columns"] = [
    {
      title: "Organization", key: "name",
      render: (_, tenant) => (
        <Flex vertical>
          <Link href={`/tenants/${tenant.id}`}><Typography.Text strong>{tenant.name}</Typography.Text></Link>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{tenant.slug}</Typography.Text>
        </Flex>
      ),
    },
    { title: "Status", dataIndex: "status", render: (status: TenantStatus) => <TenantStatusTag status={status} /> },
    { title: "Email", dataIndex: "email", responsive: ["md"] },
    { title: "Added by", dataIndex: "source", responsive: ["lg"], render: (source: TenantSource) => SOURCE_LABELS[source] },
    { title: "Users", dataIndex: "userCount", align: "right", render: (count: number | null) => count ?? "—" },
    { title: "Registered", dataIndex: "createdAt", responsive: ["md"], render: formatDate },
  ];

  return (
    <>
      <PageHeader title="Tenants" description="Companies registered on PropManagement."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New organization</Button>} />
      <ReviewQueue />
      <Card>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Search name, address or email" allowClear style={{ maxWidth: 300 }}
            onSearch={(search) => setParams((p) => ({ ...p, page: 0, search: search || undefined }))} />
          <Select placeholder="All statuses" allowClear style={{ width: 190 }}
            onChange={(status?: TenantStatus) => setParams((p) => ({ ...p, page: 0, status }))}
            options={STATUSES.map((s) => ({
              value: s, label: s === "PENDING_REVIEW" ? "Waiting for review" : s.charAt(0) + s.slice(1).toLowerCase(),
            }))} />
        </Flex>
        <Table<TenantSummary> rowKey="id" columns={columns} dataSource={tenants.data?.content}
          loading={tenants.isFetching} scroll={{ x: 600 }}
          locale={{ emptyText: tenants.error ? errorMessage(tenants.error) : "No tenants" }}
          onChange={(pagination) => setParams((p) => ({
            ...p, page: (pagination.current ?? 1) - 1, size: pagination.pageSize ?? p.size,
          }))}
          pagination={{
            current: params.page + 1, pageSize: params.size, total: tenants.data?.totalElements ?? 0,
            showSizeChanger: true, showTotal: (total) => `${total} tenant${total === 1 ? "" : "s"}`,
          }} />
      </Card>
      {createOpen && <CreateTenantDrawer onClose={() => setCreateOpen(false)} />}
    </>
  );
}
