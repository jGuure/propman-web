"use client";

import { MoreOutlined, UserAddOutlined } from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Dropdown, Flex, Input, Result, Select, Table, Typography, type MenuProps, type TableProps } from "antd";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ROLE_LABELS, RoleTag, USER_STATUS_LABELS, UserStatusTag } from "@/components/tags";
import { UserFormModal } from "@/components/tenant/UserFormModal";
import { errorMessage } from "@/lib/api/errors";
import type { User, UserListParams, UserRole, UserStatus } from "@/lib/api/types";
import { useCan, useMe, useTenant } from "@/lib/auth/tenant-context";
import { formatDate, fromNow } from "@/lib/format";

const SORT_FIELDS: Record<string, string> = { fullName: "fullName", role: "role", status: "status", lastLoginAt: "lastLoginAt", createdAt: "createdAt" };

export default function UsersPage() {
  const { api } = useTenant();
  const { data: me } = useMe();
  const canRead = useCan("users:read");
  const canManage = useCan("users:manage");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<UserListParams>({ page: 0, size: 20, sort: "createdAt,desc" });
  const [editing, setEditing] = useState<User | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const users = useQuery({
    queryKey: ["users", params],
    queryFn: () => api.users(params),
    placeholderData: keepPreviousData,
    enabled: canRead,
  });

  const action = useMutation({
    mutationFn: async ({ user, kind }: { user: User; kind: "disable" | "enable" | "resend" }) => {
      if (kind === "resend") {
        await api.resendInvite(user.id);
      } else {
        await api.updateUserStatus(user.id, kind === "disable" ? "DISABLED" : "ACTIVE");
      }
      return { user, kind };
    },
    onSuccess: ({ user, kind }) => {
      message.success(kind === "resend" ? `New invitation sent to ${user.email}`
        : kind === "disable" ? `${user.fullName} can no longer sign in` : `${user.fullName} was re-enabled`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (!canRead) {
    return <Result status="403" title="No access" subTitle="Only owners and managers can see the team." />;
  }

  const update = (patch: Partial<UserListParams>) => setParams((p) => ({ ...p, page: 0, ...patch }));

  const menuFor = (user: User): MenuProps["items"] => {
    const items: MenuProps["items"] = [{ key: "edit", label: "Edit", onClick: () => { setEditing(user); setFormOpen(true); } }];
    if (user.status === "INVITED") {
      items.push({ key: "resend", label: "Resend invitation", onClick: () => action.mutate({ user, kind: "resend" }) });
    }
    if (user.id !== me?.user.id) {
      if (user.status === "DISABLED") {
        items.push({ key: "enable", label: "Enable", onClick: () => action.mutate({ user, kind: "enable" }) });
      } else {
        items.push({
          key: "disable", label: "Disable", danger: true, onClick: () => modal.confirm({
            title: `Disable ${user.fullName}?`,
            content: "They will be signed out everywhere and cannot sign in until you enable them again.",
            okText: "Disable", okButtonProps: { danger: true },
            onOk: () => action.mutateAsync({ user, kind: "disable" }),
          }),
        });
      }
    }
    return items;
  };

  const columns: TableProps<User>["columns"] = [
    {
      title: "Name", dataIndex: "fullName", key: "fullName", sorter: true,
      render: (_, user) => (
        <Flex vertical>
          <Typography.Text strong>{user.fullName}{user.id === me?.user.id && <Typography.Text type="secondary"> (you)</Typography.Text>}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{user.email}</Typography.Text>
        </Flex>
      ),
    },
    { title: "Role", dataIndex: "role", key: "role", sorter: true, render: (role: UserRole) => <RoleTag role={role} /> },
    { title: "Status", dataIndex: "status", key: "status", sorter: true, render: (status: UserStatus) => <UserStatusTag status={status} /> },
    { title: "Last sign-in", dataIndex: "lastLoginAt", key: "lastLoginAt", sorter: true, responsive: ["md"], render: fromNow },
    { title: "Added", dataIndex: "createdAt", key: "createdAt", sorter: true, defaultSortOrder: "descend", responsive: ["lg"], render: formatDate },
    ...(canManage ? [{
      key: "actions", width: 56, align: "right" as const,
      render: (_: unknown, user: User) => (
        <Dropdown menu={{ items: menuFor(user) }} trigger={["click"]}>
          <Button type="text" icon={<MoreOutlined />} aria-label={`Actions for ${user.fullName}`} />
        </Dropdown>
      ),
    }] : []),
  ];

  const onTableChange: TableProps<User>["onChange"] = (pagination, _filters, sorter) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = single?.columnKey ? SORT_FIELDS[String(single.columnKey)] : undefined;
    setParams((p) => ({
      ...p,
      page: (pagination.current ?? 1) - 1,
      size: pagination.pageSize ?? p.size,
      sort: field && single.order ? `${field},${single.order === "ascend" ? "asc" : "desc"}` : "createdAt,desc",
    }));
  };

  return (
    <>
      <PageHeader title="Users" description="People who can sign in to your organization."
        extra={canManage && (
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            Invite user
          </Button>
        )} />
      <Card>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Search name or email" allowClear style={{ maxWidth: 280 }}
            onSearch={(search) => update({ search: search || undefined })} />
          <Select placeholder="All roles" allowClear style={{ width: 160 }} onChange={(role?: UserRole) => update({ role })}
            options={(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
          <Select placeholder="All statuses" allowClear style={{ width: 160 }} onChange={(status?: UserStatus) => update({ status })}
            options={(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((s) => ({ value: s, label: USER_STATUS_LABELS[s] }))} />
        </Flex>
        <Table<User> rowKey="id" columns={columns} dataSource={users.data?.content} loading={users.isFetching}
          onChange={onTableChange} scroll={{ x: 600 }}
          locale={{ emptyText: users.error ? errorMessage(users.error) : "No users match these filters" }}
          pagination={{
            current: params.page + 1, pageSize: params.size, total: users.data?.totalElements ?? 0,
            showSizeChanger: true, showTotal: (total) => `${total} user${total === 1 ? "" : "s"}`,
          }} />
      </Card>
      <UserFormModal open={formOpen} user={editing} onClose={() => setFormOpen(false)} />
    </>
  );
}
