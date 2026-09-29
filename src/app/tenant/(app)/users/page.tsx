"use client";

import { MoreOutlined, UserAddOutlined } from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Dropdown, Flex, Input, Result, Select, Typography, type MenuProps, type TableProps } from "antd";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { FilterPanel } from "@/components/FilterPanel";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { RoleTag, UserStatusTag } from "@/components/tags";
import { UserFormModal } from "@/components/tenant/UserFormModal";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { User, UserListParams, UserRole, UserStatus } from "@/lib/api/types";
import { useCan, useMe, useTenant } from "@/lib/auth/tenant-context";
import { formatDate, fromNow } from "@/lib/format";
import { USER_ROLES, USER_STATUSES, useLabels } from "@/lib/labels";

const SORT_FIELDS: Record<string, string> = { fullName: "fullName", role: "role", status: "status", lastLoginAt: "lastLoginAt", createdAt: "createdAt" };

export default function UsersPage() {
  const { api } = useTenant();
  const { data: me } = useMe();
  const { t, tn } = useT();
  const labels = useLabels();
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
      message.success(kind === "resend" ? t("users.resent", { email: user.email })
        : t(kind === "disable" ? "users.disabledMsg" : "users.enabledMsg", { name: user.fullName }));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (!canRead) {
    return <Result status="403" title={t("gate.noAccess")} subTitle={t("users.noAccessText")} />;
  }

  const update = (patch: Partial<UserListParams>) => setParams((p) => ({ ...p, page: 0, ...patch }));

  const menuFor = (user: User): MenuProps["items"] => {
    const items: MenuProps["items"] = [{ key: "edit", label: t("common.edit"), onClick: () => { setEditing(user); setFormOpen(true); } }];
    if (user.status === "INVITED") {
      items.push({ key: "resend", label: t("users.resend"), onClick: () => action.mutate({ user, kind: "resend" }) });
    }
    if (user.id !== me?.user.id) {
      if (user.status === "DISABLED") {
        items.push({ key: "enable", label: t("users.enable"), onClick: () => action.mutate({ user, kind: "enable" }) });
      } else {
        items.push({
          key: "disable", label: t("users.disable"), danger: true, onClick: () => modal.confirm({
            title: t("users.disableTitle", { name: user.fullName }),
            content: t("users.disableText"),
            okText: t("users.disable"), okButtonProps: { danger: true },
            onOk: () => action.mutateAsync({ user, kind: "disable" }),
          }),
        });
      }
    }
    return items;
  };

  const columns: TableProps<User>["columns"] = [
    {
      title: t("users.name"), dataIndex: "fullName", key: "fullName", sorter: true,
      render: (_, user) => (
        <Flex vertical>
          <Typography.Text strong>{user.fullName}{user.id === me?.user.id && <Typography.Text type="secondary"> {t("users.you")}</Typography.Text>}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{user.email}</Typography.Text>
        </Flex>
      ),
    },
    { title: t("users.role"), dataIndex: "role", key: "role", sorter: true, render: (role: UserRole) => <RoleTag role={role} /> },
    { title: t("common.status"), dataIndex: "status", key: "status", sorter: true, render: (status: UserStatus) => <UserStatusTag status={status} /> },
    { title: t("users.lastSignIn"), dataIndex: "lastLoginAt", key: "lastLoginAt", sorter: true, responsive: ["md"], render: (at: string | null) => fromNow(at) },
    { title: t("common.added"), dataIndex: "createdAt", key: "createdAt", sorter: true, defaultSortOrder: "descend", responsive: ["lg"], render: formatDate },
    ...(canManage ? [{
      key: "actions", width: 56, align: "right" as const,
      render: (_: unknown, user: User) => (
        <Dropdown menu={{ items: menuFor(user) }} trigger={["click"]}>
          <Button type="text" icon={<MoreOutlined />} aria-label={t("users.actionsFor", { name: user.fullName })} />
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
      <PageHeader title={t("users.title")} description={t("users.subtitle")}
        extra={canManage && (
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            {t("users.invite")}
          </Button>
        )} />
      <Card>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder={t("users.searchPlaceholder")} allowClear style={{ maxWidth: 280 }}
            onSearch={(search) => update({ search: search || undefined })} />
          <FilterPanel active={[params.role, params.status].filter(Boolean).length}>
<Select placeholder={t("users.allRoles")} allowClear style={{ width: 160 }} onChange={(role?: UserRole) => update({ role })}
            options={USER_ROLES.map((r) => ({ value: r, label: labels.role(r) }))} />
          <Select placeholder={t("users.allStatuses")} allowClear style={{ width: 160 }} onChange={(status?: UserStatus) => update({ status })}
            options={USER_STATUSES.map((s) => ({ value: s, label: labels.userStatus(s) }))} />
          </FilterPanel>
        </Flex>
        <ResponsiveTable<User> rowKey="id" columns={columns} dataSource={users.data?.content} loading={users.isFetching}
          onChange={onTableChange} scroll={{ x: 600 }}
          locale={{ emptyText: users.error ? errorMessage(users.error) : t("users.noMatch") }}
          pagination={{
            current: params.page + 1, pageSize: params.size, total: users.data?.totalElements ?? 0,
            showSizeChanger: true, showTotal: (total) => tn("count.users", total),
          }} />
      </Card>
      <UserFormModal open={formOpen} user={editing} onClose={() => setFormOpen(false)} />
    </>
  );
}
