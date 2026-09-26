"use client";

import { MailOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";

export default function ForgotPasswordPage() {
  const { api } = useTenant();
  const { data: branding } = useBranding();
  const { t } = useT();
  const request = useMutation({ mutationFn: (email: string) => api.forgotPassword(email) });

  return (
    <AuthCard title={t("auth.forgotTitle")} organizationName={branding?.name} logoUrl={branding?.logoUrl}
      footer={<Link href="/login">{t("auth.backToSignIn")}</Link>}>
      {request.isSuccess ? (
        <Result status="success" title={t("auth.checkEmail")}
          subTitle={t("auth.checkEmailText")} />
      ) : (
        <>
          {request.error && (
            <Alert type="error" showIcon title={errorMessage(request.error)} style={{ marginBottom: 16 }} />
          )}
          <Form<{ email: string }> layout="vertical" requiredMark={false}
            onFinish={({ email }) => request.mutate(email)} disabled={request.isPending}>
            <Form.Item name="email" label={t("common.email")}
              extra={t("auth.forgotHelp")}
              rules={[{ required: true, type: "email", message: t("validation.enterEmail") }]}>
              <Input prefix={<MailOutlined />} autoComplete="email" autoFocus size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={request.isPending}>
              {t("auth.sendResetLink")}
            </Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
