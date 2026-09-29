"use client";

import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { useT } from "@/i18n/provider";
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
  const { t } = useT();
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
    <AuthCard title={t("auth.resetTitle")} organizationName={branding?.name} logoUrl={branding?.logoUrl}
      footer={<Link href="/login">{t("auth.backToSignIn")}</Link>}>
      {!token || tokenProblem ? (
        <Result status="warning" title={t("auth.linkInvalidTitle")}
          subTitle={tokenProblem ? errorMessage(reset.error) : t("auth.linkIncomplete")}
          extra={<Link href="/forgot-password">{t("auth.requestNewLink")}</Link>} />
      ) : (
        <>
          {reset.error && !hasFieldErrors(reset.error) && (
            <Alert type="error" showIcon title={errorMessage(reset.error)} style={{ marginBottom: 16 }} />
          )}
          <Form<ResetForm> form={form} layout="vertical" requiredMark={false}
            onFinish={(values) => reset.mutate(values)} disabled={reset.isPending}>
            <Form.Item name="newPassword" label={t("auth.newPassword")} rules={passwordRules(t)}
              extra={t("validation.passwordHelp")}>
              <Input.Password autoComplete="new-password" autoFocus size="large" />
            </Form.Item>
            <Form.Item name="confirm" label={t("common.confirmPassword")} dependencies={["newPassword"]}
              rules={confirmPasswordRule(t, "newPassword")}>
              <Input.Password autoComplete="new-password" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={reset.isPending}>
              {t("auth.changePassword")}
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
