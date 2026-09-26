"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";

interface LoginForm {
  email: string;
  password: string;
}

function LoginPage() {
  const { api, ready, isAuthenticated, signIn } = useTenant();
  const { data: branding } = useBranding();
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useMutation({
    mutationFn: (values: LoginForm) => api.login(values.email, values.password),
    onSuccess: (auth) => signIn(auth),
  });

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  const notice = searchParams.get("expired")
    ? t("auth.sessionExpired")
    : searchParams.get("reset")
      ? t("auth.passwordChanged")
      : null;

  return (
    <AuthCard title={t("auth.signIn")} organizationName={branding?.name} logoUrl={branding?.logoUrl}
      subtitle={t("auth.signInWelcome")}>
      {notice && !login.error && <Alert type="info" showIcon title={notice} style={{ marginBottom: 16 }} />}
      {login.error && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          title={errorMessage(login.error)} />
      )}
      <Form<LoginForm> layout="vertical" requiredMark={false} onFinish={(values) => login.mutate(values)}
        disabled={login.isPending}>
        <Form.Item name="email" label={t("common.email")} rules={[{ required: true, type: "email", message: t("validation.enterEmail") }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" autoFocus size="large" />
        </Form.Item>
        <Form.Item name="password" label={t("common.password")} rules={[{ required: true, message: t("validation.enterPassword") }]}
          style={{ marginBottom: 8 }}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
        </Form.Item>
        <div style={{ textAlign: "right", marginBottom: 16 }}>
          <Link href="/forgot-password">{t("auth.forgotPasswordLink")}</Link>
        </div>
        <Button type="primary" htmlType="submit" block size="large" loading={login.isPending}>
          {t("auth.signIn")}
        </Button>
      </Form>
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
