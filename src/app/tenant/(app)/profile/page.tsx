"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Col, Descriptions, Flex, Form, Input, Row } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { RoleTag } from "@/components/tags";
import { useT } from "@/i18n/provider";
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
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [profileForm] = Form.useForm<ProfileForm>();
  const [passwordForm] = Form.useForm<PasswordForm>();

  const saveProfile = useMutation({
    mutationFn: (values: ProfileForm) => api.updateProfile({ fullName: values.fullName, phone: values.phone || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      message.success(t("profile.saved"));
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
      message.success(t("profile.changed"));
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
      <PageHeader title={t("profile.title")} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t("profile.personal")}>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t("common.email")}>{user.email}</Descriptions.Item>
              <Descriptions.Item label={t("profile.role")}><RoleTag role={user.role} /></Descriptions.Item>
              <Descriptions.Item label={t("profile.lastSignIn")}>{fromNow(user.lastLoginAt)}</Descriptions.Item>
            </Descriptions>
            <Form<ProfileForm> form={profileForm} layout="vertical" requiredMark={false}
              initialValues={{ fullName: user.fullName, phone: user.phone ?? undefined }}
              disabled={saveProfile.isPending} onFinish={(values) => saveProfile.mutate(values)}>
              <Form.Item name="fullName" label={t("common.fullName")} rules={[{ required: true, message: t("validation.enterName") }, { max: 150 }]}>
                <Input autoComplete="name" />
              </Form.Item>
              <Form.Item name="phone" label={t("common.phone")} rules={[{ max: 30 }]}>
                <Input autoComplete="tel" />
              </Form.Item>
              <Flex justify="end">
                <Button type="primary" htmlType="submit" loading={saveProfile.isPending}>{t("common.save")}</Button>
              </Flex>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t("profile.changePassword")}>
            <Form<PasswordForm> form={passwordForm} layout="vertical" requiredMark={false}
              disabled={changePassword.isPending} onFinish={(values) => changePassword.mutate(values)}>
              <Form.Item name="currentPassword" label={t("profile.currentPassword")}
                rules={[{ required: true, message: t("profile.enterCurrent") }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item name="newPassword" label={t("profile.newPassword")} rules={passwordRules(t)}
                extra={t("profile.newPasswordHelp")}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="confirm" label={t("profile.confirmNew")} dependencies={["newPassword"]}
                rules={confirmPasswordRule(t, "newPassword")}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Flex justify="end">
                <Button type="primary" htmlType="submit" loading={changePassword.isPending}>{t("profile.changePassword")}</Button>
              </Flex>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
}
