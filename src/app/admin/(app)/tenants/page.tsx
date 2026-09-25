"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card, Flex, Input, Select, Table, Typography, type TableProps } from "antd";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TenantStatusTag } from "@/components/tags";
import { errorMessage } from "@/lib/api/errors";
import type { TenantListParams, TenantStatus, TenantSummary } from "@/lib/api/types";
import { usePlatform } from "@/lib/auth/platform-context";
import { formatDate } from "@/lib/format";

const STATUSES: TenantStatus[] = ["ACTIVE", "SUSPENDED", "PROVISIONING", "FAILED"];

export default function TenantsPage() {
  const { api } = usePlatform();
  const [params, setParams] = useState<TenantListParams>({ page: 0, size: 20 });
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
    { title: "Users", dataIndex: "userCount", align: "right", render: (count: number | null) => count ?? "—" },
    { title: "Registered", dataIndex: "createdAt", responsive: ["md"], render: formatDate },
  ];

  return (
    <>
      <PageHeader title="Tenants" description="Companies registered on PropManagement." />
      <Card>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Search name, address or email" allowClear style={{ maxWidth: 300 }}
            onSearch={(search) => setParams((p) => ({ ...p, page: 0, search: search || undefined }))} />
          <Select placeholder="All statuses" allowClear style={{ width: 170 }}
            onChange={(status?: TenantStatus) => setParams((p) => ({ ...p, page: 0, status }))}
            options={STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
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
    </>
  );
}
