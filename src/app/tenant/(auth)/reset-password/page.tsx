"use client";

import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { errorMessage, hasFieldErrors, isApiError } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors, confirmPasswordRule, passwordRules } from "@/lib/forms";

interface ResetForm {
  newPassword: string;
  confirm: string;
}

function ResetPasswordPage() {
  const { api } = useTenant();
  const { data: branding } = useBranding();
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [form] = Form.useForm<ResetForm>();
  const reset = useMutation({
    mutationFn: (values: ResetForm) => api.resetPassword(token ?? "", values.newPassword),
    onSuccess: () => router.replace("/login?reset=1"),
    onError: (error) => applyFieldErrors(form, error),
  });
  const tokenProblem = isApiError(reset.error, "TOKEN_INVALID") || isApiError(reset.error, "TOKEN_EXPIRED");

  return (
    <AuthCard title="Choose a new password" organizationName={branding?.name} logoUrl={branding?.logoUrl}
      footer={<Link href="/login">Back to sign in</Link>}>
      {!token || tokenProblem ? (
        <Result status="warning" title="This link is not valid"
          subTitle={tokenProblem ? errorMessage(reset.error) : "The reset link is incomplete."}
          extra={<Link href="/forgot-password">Request a new link</Link>} />
      ) : (
        <>
          {reset.error && !hasFieldErrors(reset.error) && (
            <Alert type="error" showIcon title={errorMessage(reset.error)} style={{ marginBottom: 16 }} />
          )}
          <Form<ResetForm> form={form} layout="vertical" requiredMark={false}
            onFinish={(values) => reset.mutate(values)} disabled={reset.isPending}>
            <Form.Item name="newPassword" label="New password" rules={passwordRules}
              extra="At least 8 characters with a letter and a digit.">
              <Input.Password autoComplete="new-password" autoFocus size="large" />
            </Form.Item>
            <Form.Item name="confirm" label="Confirm password" dependencies={["newPassword"]}
              rules={confirmPasswordRule("newPassword")}>
              <Input.Password autoComplete="new-password" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={reset.isPending}>
              Change password
            </Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
