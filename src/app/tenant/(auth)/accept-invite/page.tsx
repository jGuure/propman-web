"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result, Skeleton } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useBranding } from "@/components/tenant/TenantGate";
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
      <Result status="warning" title="This invitation is not valid"
        subTitle={invite.error ? errorMessage(invite.error) : "The invitation link is incomplete."}
        extra="Ask the owner of the organization to send you a new invitation." />
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
          <Form.Item label="Email">
            <Input value={invite.data.email} disabled size="large" />
          </Form.Item>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: "Enter your name" }]}>
            <Input autoComplete="name" size="large" />
          </Form.Item>
          <Form.Item name="phone" label="Phone (optional)">
            <Input autoComplete="tel" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={passwordRules}
            extra="At least 8 characters with a letter and a digit.">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item name="confirm" label="Confirm password" dependencies={["password"]}
            rules={confirmPasswordRule("password")}>
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={accept.isPending}>
            Join {invite.data.organizationName}
          </Button>
        </Form>
      </>
    );
  }

  return (
    <AuthCard title="Accept invitation" organizationName={branding?.name} logoUrl={branding?.logoUrl}
      subtitle="Set a password to activate your account." footer={<Link href="/login">Already active? Sign in</Link>}>
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
