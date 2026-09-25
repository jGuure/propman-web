"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";

interface LoginForm {
  email: string;
  password: string;
}

function LoginPage() {
  const { api, ready, isAuthenticated, signIn } = useTenant();
  const { data: branding } = useBranding();
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
    ? "Your session has expired. Please sign in again."
    : searchParams.get("reset")
      ? "Your password has been changed. Sign in with your new password."
      : null;

  return (
    <AuthCard title="Sign in" organizationName={branding?.name} logoUrl={branding?.logoUrl}
      subtitle="Welcome back! Sign in to continue.">
      {notice && !login.error && <Alert type="info" showIcon title={notice} style={{ marginBottom: 16 }} />}
      {login.error && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          title={isApiError(login.error, "RATE_LIMITED") ? "Too many attempts. Wait a minute and try again."
            : errorMessage(login.error)} />
      )}
      <Form<LoginForm> layout="vertical" requiredMark={false} onFinish={(values) => login.mutate(values)}
        disabled={login.isPending}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Enter your email" }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" autoFocus size="large" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: "Enter your password" }]}
          style={{ marginBottom: 8 }}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
        </Form.Item>
        <div style={{ textAlign: "right", marginBottom: 16 }}>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="primary" htmlType="submit" block size="large" loading={login.isPending}>
          Sign in
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
