"use client";

import { MailOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { errorMessage } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";

export default function ForgotPasswordPage() {
  const { api } = useTenant();
  const { data: branding } = useBranding();
  const request = useMutation({ mutationFn: (email: string) => api.forgotPassword(email) });

  return (
    <AuthCard title="Forgot password" organizationName={branding?.name} logoUrl={branding?.logoUrl}
      footer={<Link href="/login">Back to sign in</Link>}>
      {request.isSuccess ? (
        <Result status="success" title="Check your email"
          subTitle="If an account exists for this email, we have sent a link to reset the password. The link is valid for 1 hour." />
      ) : (
        <>
          {request.error && (
            <Alert type="error" showIcon title={errorMessage(request.error)} style={{ marginBottom: 16 }} />
          )}
          <Form<{ email: string }> layout="vertical" requiredMark={false}
            onFinish={({ email }) => request.mutate(email)} disabled={request.isPending}>
            <Form.Item name="email" label="Email"
              extra="We will email you a link to choose a new password."
              rules={[{ required: true, type: "email", message: "Enter your email" }]}>
              <Input prefix={<MailOutlined />} autoComplete="email" autoFocus size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={request.isPending}>
              Send reset link
            </Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
