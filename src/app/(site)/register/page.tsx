"use client";

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Col, Divider, Form, Input, Row, Select, Space, Typography } from "antd";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthCard } from "@/components/AuthCard";
import { errorMessage, hasFieldErrors } from "@/lib/api/errors";
import { publicApi } from "@/lib/api/public-api";
import type { RegisterRequest } from "@/lib/api/types";
import { tenantHostSuffix } from "@/lib/config";
import { applyFieldErrors, confirmPasswordRule, passwordRules, suggestSlug } from "@/lib/forms";
import { navigateToOrigin } from "@/lib/navigation";
import { countryOptions } from "@/lib/reference-data";

type RegisterForm = RegisterRequest & { confirm: string };

const REASONS: Record<string, string> = {
  INVALID_FORMAT: "Use 3–30 lowercase letters, digits and single hyphens",
  RESERVED: "This address is reserved",
  TAKEN: "This address is already taken",
};

function toRequest(values: RegisterForm): RegisterRequest {
  return {
    companyName: values.companyName,
    slug: values.slug,
    companyEmail: values.companyEmail,
    companyPhone: values.companyPhone,
    country: values.country,
    city: values.city,
    ownerFullName: values.ownerFullName,
    ownerEmail: values.ownerEmail,
    ownerPhone: values.ownerPhone,
    password: values.password,
  };
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function RegisterPage() {
  const [form] = Form.useForm<RegisterForm>();
  const slugEdited = useRef(false);
  const slug = (Form.useWatch("slug", form) ?? "").trim().toLowerCase();
  const debouncedSlug = useDebounced(slug, 400);
  const countries = useMemo(() => countryOptions(), []);
  const availability = useQuery({
    queryKey: ["slug-availability", debouncedSlug],
    queryFn: () => publicApi.slugAvailability(debouncedSlug),
    enabled: debouncedSlug.length >= 3,
    staleTime: 10_000,
  });
  const register = useMutation({
    mutationFn: (values: RegisterForm) => publicApi.register(toRequest(values)),
    onSuccess: ({ tenant, auth }) => {
      // hand the new session to the tenant subdomain; the fragment never reaches a server
      navigateToOrigin(`${tenant.url}/welcome#token=${encodeURIComponent(auth.refreshToken)}`);
    },
    onError: (error) => applyFieldErrors(form, error),
  });

  const checking = slug.length >= 3 && (slug !== debouncedSlug || availability.isFetching);
  const status = availability.data && availability.data.slug === slug ? availability.data : undefined;
  let slugHelp: ReactNode = "Your team will sign in at this address. It cannot be changed later.";
  if (checking) {
    slugHelp = <span><LoadingOutlined /> Checking…</span>;
  } else if (status?.available) {
    slugHelp = <Typography.Text type="success"><CheckCircleFilled /> Available</Typography.Text>;
  } else if (status?.reason) {
    slugHelp = <Typography.Text type="danger"><CloseCircleFilled /> {REASONS[status.reason]}</Typography.Text>;
  }

  return (
    <AuthCard title="Register your company" width={640}
      subtitle="Create your organization and your owner account."
      footer={<Typography.Text type="secondary">Already registered? <Link href="/#sign-in">Sign in</Link></Typography.Text>}>
      {register.error && !hasFieldErrors(register.error) && (
        <Alert type="error" showIcon title={errorMessage(register.error)} style={{ marginBottom: 16 }} />
      )}
      <Form<RegisterForm> form={form} layout="vertical" requiredMark={false} disabled={register.isPending}
        initialValues={{ country: "SO" }} onFinish={(values) => register.mutate(values)}
        onValuesChange={(changed: Partial<RegisterForm>) => {
          if ("slug" in changed) {
            slugEdited.current = true;
          }
          if ("companyName" in changed && !slugEdited.current) {
            form.setFieldValue("slug", suggestSlug(changed.companyName ?? ""));
          }
        }}>
        <Divider titlePlacement="start" plain style={{ marginTop: 0 }}>Company</Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="companyName" label="Company name" rules={[{ required: true, message: "Enter the company name" }, { max: 150 }]}>
              <Input autoFocus placeholder="Hodan Estates" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Web address" required extra={slugHelp}
              validateStatus={status && !status.available && !checking ? "error" : undefined}>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="slug" noStyle normalize={(value: string) => value.toLowerCase()}
                  rules={[{ required: true, message: "Choose a web address" }]}>
                  <Input placeholder="hodan-estates" maxLength={30} />
                </Form.Item>
                <Space.Addon>.{tenantHostSuffix()}</Space.Addon>
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="companyEmail" label="Company email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
              <Input placeholder="info@company.so" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="companyPhone" label="Company phone (optional)" rules={[{ max: 30 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="country" label="Country">
              <Select showSearch={{ optionFilterProp: "label" }} options={countries} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="city" label="City (optional)" rules={[{ max: 80 }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Divider titlePlacement="start" plain>Your account</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="ownerFullName" label="Full name" rules={[{ required: true, message: "Enter your name" }, { max: 150 }]}>
              <Input autoComplete="name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="ownerPhone" label="Phone (optional)" rules={[{ max: 30 }]}>
              <Input autoComplete="tel" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="ownerEmail" label="Email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
              <Input autoComplete="email" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="password" label="Password" rules={passwordRules}
              extra="At least 8 characters with a letter and a digit.">
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="confirm" label="Confirm password" dependencies={["password"]} rules={confirmPasswordRule("password")}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" block size="large" loading={register.isPending}>
          {register.isPending ? "Creating your organization…" : "Create organization"}
        </Button>
      </Form>
    </AuthCard>
  );
}
