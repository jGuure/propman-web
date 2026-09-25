"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";
import { errorMessage } from "@/lib/api/errors";
import { usePlatform } from "@/lib/auth/platform-context";

function PlatformLoginPage() {
  const { api, ready, isAuthenticated, signIn } = usePlatform();
  const router = useRouter();
  const expired = useSearchParams().get("expired");
  const login = useMutation({
    mutationFn: (values: { email: string; password: string }) => api.login(values.email, values.password),
    onSuccess: (auth) => signIn(auth),
  });

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/tenants");
    }
  }, [ready, isAuthenticated, router]);

  return (
    <AuthCard title="Platform administration" organizationName="IL Software"
      subtitle="For IL Software staff only.">
      {expired && !login.error && (
        <Alert type="info" showIcon title="Your session has expired. Please sign in again." style={{ marginBottom: 16 }} />
      )}
      {login.error && <Alert type="error" showIcon title={errorMessage(login.error)} style={{ marginBottom: 16 }} />}
      <Form layout="vertical" requiredMark={false} disabled={login.isPending} onFinish={(values) => login.mutate(values)}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Enter your email" }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" autoFocus size="large" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: "Enter your password" }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={login.isPending}>Sign in</Button>
      </Form>
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PlatformLoginPage />
    </Suspense>
  );
}
