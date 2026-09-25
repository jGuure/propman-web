"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import { ROLE_LABELS } from "@/components/tags";
import { errorMessage } from "@/lib/api/errors";
import type { User, UserRole } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";

interface UserForm {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({ value: role, label: ROLE_LABELS[role] }));

const ROLE_HELP: Record<UserRole, string> = {
  OWNER: "Full access, including users and organization settings.",
  MANAGER: "Day-to-day operations; can see the team.",
  ACCOUNTANT: "Finance work; no user management.",
  STAFF: "Basic access.",
};

/** Invite a new user (no `user`) or edit an existing one. */
export function UserFormModal({ open, user, onClose }: { open: boolean; user?: User; onClose: () => void }) {
  const { api } = useTenant();
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
      message.success(editing ? "User updated" : `Invitation sent to ${saved.email}`);
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
    <Modal open={open} title={editing ? "Edit user" : "Invite user"} okText={editing ? "Save" : "Send invitation"}
      onCancel={onClose} onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden>
      <Form<UserForm> form={form} layout="vertical" requiredMark={false} onFinish={(values) => save.mutate(values)}>
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: "Enter a name" }, { max: 150 }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item name="email" label="Email"
          rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
          extra={editing ? undefined : "We will email an invitation link, valid for 7 days."}>
          <Input disabled={editing} />
        </Form.Item>
        <Form.Item name="phone" label="Phone (optional)" rules={[{ max: 30 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]} extra={role ? ROLE_HELP[role] : undefined}>
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
