"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Col, Descriptions, Flex, Form, Input, Row } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { RoleTag } from "@/components/tags";
import { errorMessage } from "@/lib/api/errors";
import { useMe, useTenant } from "@/lib/auth/tenant-context";
import { fromNow } from "@/lib/format";
import { applyFieldErrors, confirmPasswordRule, passwordRules } from "@/lib/forms";

interface ProfileForm {
  fullName: string;
  phone?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

export default function ProfilePage() {
  const { api } = useTenant();
  const { data: me } = useMe();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [profileForm] = Form.useForm<ProfileForm>();
  const [passwordForm] = Form.useForm<PasswordForm>();

  const saveProfile = useMutation({
    mutationFn: (values: ProfileForm) => api.updateProfile({ fullName: values.fullName, phone: values.phone || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      message.success("Profile saved");
    },
    onError: (error) => {
      if (!applyFieldErrors(profileForm, error)) {
        message.error(errorMessage(error));
      }
    },
  });
  const changePassword = useMutation({
    mutationFn: (values: PasswordForm) => api.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      passwordForm.resetFields();
      message.success("Password changed. Other devices have been signed out.");
    },
    onError: (error) => {
      if (!applyFieldErrors(passwordForm, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  if (!me) {
    return null;
  }
  const { user } = me;

  return (
    <>
      <PageHeader title="My profile" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Personal details">
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Role"><RoleTag role={user.role} /></Descriptions.Item>
              <Descriptions.Item label="Last sign-in">{fromNow(user.lastLoginAt)}</Descriptions.Item>
            </Descriptions>
            <Form<ProfileForm> form={profileForm} layout="vertical" requiredMark={false}
              initialValues={{ fullName: user.fullName, phone: user.phone ?? undefined }}
              disabled={saveProfile.isPending} onFinish={(values) => saveProfile.mutate(values)}>
              <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: "Enter your name" }, { max: 150 }]}>
                <Input autoComplete="name" />
              </Form.Item>
              <Form.Item name="phone" label="Phone" rules={[{ max: 30 }]}>
                <Input autoComplete="tel" />
              </Form.Item>
              <Flex justify="end">
                <Button type="primary" htmlType="submit" loading={saveProfile.isPending}>Save</Button>
              </Flex>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Change password">
            <Form<PasswordForm> form={passwordForm} layout="vertical" requiredMark={false}
              disabled={changePassword.isPending} onFinish={(values) => changePassword.mutate(values)}>
              <Form.Item name="currentPassword" label="Current password"
                rules={[{ required: true, message: "Enter your current password" }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item name="newPassword" label="New password" rules={passwordRules}
                extra="At least 8 characters with a letter and a digit. Other devices will be signed out.">
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="confirm" label="Confirm new password" dependencies={["newPassword"]}
                rules={confirmPasswordRule("newPassword")}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Flex justify="end">
                <Button type="primary" htmlType="submit" loading={changePassword.isPending}>Change password</Button>
              </Flex>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
}
