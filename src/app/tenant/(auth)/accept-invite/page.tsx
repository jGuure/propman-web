"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result, Skeleton } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
import { useT } from "@/i18n/provider";
import { errorMessage, hasFieldErrors } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors, confirmPasswordRule, passwordRules } from "@/lib/forms";

interface AcceptForm {
  fullName: string;
  phone?: string;
  password: string;
  confirm: string;
}

function AcceptInvitePage() {
  const { api, signIn } = useTenant();
  const { data: branding } = useBranding();
  const { t } = useT();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [form] = Form.useForm<AcceptForm>();
  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => api.inviteInfo(token),
    enabled: token.length > 0,
    retry: false,
  });
  const accept = useMutation({
    mutationFn: (values: AcceptForm) =>
      api.acceptInvite({ token, password: values.password, fullName: values.fullName, phone: values.phone }),
    onSuccess: (auth) => {
      signIn(auth);
      router.replace("/dashboard");
    },
    onError: (error) => applyFieldErrors(form, error),
  });

  let content;
  if (!token || invite.error) {
    content = (
      <Result status="warning" title={t("auth.inviteInvalid")}
        subTitle={invite.error ? errorMessage(invite.error) : t("auth.inviteIncomplete")}
        extra={t("auth.inviteAskOwner")} />
    );
  } else if (!invite.data) {
    content = <Skeleton active />;
  } else {
    content = (
      <>
        {accept.error && !hasFieldErrors(accept.error) && (
          <Alert type="error" showIcon title={errorMessage(accept.error)} style={{ marginBottom: 16 }} />
        )}
        <Form<AcceptForm> form={form} layout="vertical" requiredMark={false} disabled={accept.isPending}
          initialValues={{ fullName: invite.data.fullName }} onFinish={(values) => accept.mutate(values)}>
          <Form.Item label={t("common.email")}>
            <Input value={invite.data.email} disabled size="large" />
          </Form.Item>
          <Form.Item name="fullName" label={t("common.fullName")} rules={[{ required: true, message: t("validation.enterName") }]}>
            <Input autoComplete="name" size="large" />
          </Form.Item>
          <Form.Item name="phone" label={t("common.phoneOptional")}>
            <Input autoComplete="tel" size="large" />
          </Form.Item>
          <Form.Item name="password" label={t("common.password")} rules={passwordRules(t)}
            extra={t("validation.passwordHelp")}>
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item name="confirm" label={t("common.confirmPassword")} dependencies={["password"]}
            rules={confirmPasswordRule(t, "password")}>
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={accept.isPending}>
            {t("auth.join", { name: invite.data.organizationName })}
          </Button>
        </Form>
      </>
    );
  }

  return (
    <AuthCard title={t("auth.inviteTitle")} organizationName={branding?.name} logoUrl={branding?.logoUrl}
      subtitle={t("auth.inviteSubtitle")} footer={<Link href="/login">{t("auth.alreadyActive")}</Link>}>
      {content}
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AcceptInvitePage />
    </Suspense>
  );
}
