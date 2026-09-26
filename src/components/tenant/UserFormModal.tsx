"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { User, UserRole } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { USER_ROLES, useLabels } from "@/lib/labels";

interface UserForm {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
}

/** Invite a new user (no `user`) or edit an existing one. */
export function UserFormModal({ open, user, onClose }: { open: boolean; user?: User; onClose: () => void }) {
  const { api } = useTenant();
  const { t } = useT();
  const labels = useLabels();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserForm>();
  const role = Form.useWatch("role", form);
  const editing = !!user;

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(user ? { fullName: user.fullName, email: user.email, phone: user.phone ?? undefined, role: user.role }
        : { role: "STAFF" });
    }
  }, [open, user, form]);

  const save = useMutation({
    mutationFn: (values: UserForm) =>
      user
        ? api.updateUser(user.id, { fullName: values.fullName, phone: values.phone || null, role: values.role })
        : api.inviteUser({ fullName: values.fullName, email: values.email, phone: values.phone || undefined, role: values.role }),
    onSuccess: (saved) => {
      message.success(editing ? t("users.updated") : t("users.invited", { email: saved.email }));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Modal open={open} title={editing ? t("users.editTitle") : t("users.inviteTitle")} okText={editing ? t("common.save") : t("users.sendInvite")}
      onCancel={onClose} onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden>
      <Form<UserForm> form={form} layout="vertical" requiredMark={false} onFinish={(values) => save.mutate(values)}>
        <Form.Item name="fullName" label={t("common.fullName")} rules={[{ required: true, message: t("validation.enterName") }, { max: 150 }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item name="email" label={t("common.email")}
          rules={[{ required: true, type: "email", message: t("validation.validEmail") }]}
          extra={editing ? undefined : t("users.inviteHelp")}>
          <Input disabled={editing} />
        </Form.Item>
        <Form.Item name="phone" label={t("common.phoneOptional")} rules={[{ max: 30 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label={t("users.role")} rules={[{ required: true }]} extra={role ? labels.roleHelp(role) : undefined}>
          <Select options={USER_ROLES.map((r) => ({ value: r, label: labels.role(r) }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
