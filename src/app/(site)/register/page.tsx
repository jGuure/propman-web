"use client";

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Col, Divider, Form, Input, Result, Row, Select, Space, Typography } from "antd";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthCard } from "@/components/AuthCard";
import { useT } from "@/i18n/provider";
import { errorMessage, hasFieldErrors } from "@/lib/api/errors";
import { publicApi } from "@/lib/api/public-api";
import type { RegisterRequest } from "@/lib/api/types";
import { tenantHostSuffix } from "@/lib/config";
import { applyFieldErrors, confirmPasswordRule, passwordRules, suggestSlug } from "@/lib/forms";
import { navigateToOrigin } from "@/lib/navigation";
import { countryOptions } from "@/lib/reference-data";

type RegisterForm = RegisterRequest & { confirm: string };

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
  const { t, lang } = useT();
  const [form] = Form.useForm<RegisterForm>();
  const slugEdited = useRef(false);
  const slug = (Form.useWatch("slug", form) ?? "").trim().toLowerCase();
  const debouncedSlug = useDebounced(slug, 400);
  const countries = useMemo(() => countryOptions(undefined, lang), [lang]);
  const availability = useQuery({
    queryKey: ["slug-availability", debouncedSlug],
    queryFn: () => publicApi.slugAvailability(debouncedSlug),
    enabled: debouncedSlug.length >= 3,
    staleTime: 10_000,
  });
  const register = useMutation({
    mutationFn: (values: RegisterForm) => publicApi.register(toRequest(values)),
    onSuccess: ({ tenant, auth }) => {
      // waiting for approval: the page shows the "we are reviewing it" message instead
      if (auth) {
        // hand the new session to the tenant subdomain; the fragment never reaches a server
        navigateToOrigin(`${tenant.url}/welcome#token=${encodeURIComponent(auth.refreshToken)}`);
      }
    },
    onError: (error) => applyFieldErrors(form, error),
  });

  const checking = slug.length >= 3 && (slug !== debouncedSlug || availability.isFetching);
  const status = availability.data && availability.data.slug === slug ? availability.data : undefined;
  let slugHelp: ReactNode = t("register.addressHelp");
  if (checking) {
    slugHelp = <span><LoadingOutlined /> {t("register.checking")}</span>;
  } else if (status?.available) {
    slugHelp = <Typography.Text type="success"><CheckCircleFilled /> {t("register.available")}</Typography.Text>;
  } else if (status?.reason) {
    slugHelp = <Typography.Text type="danger"><CloseCircleFilled /> {status.reason === "INVALID_FORMAT" || status.reason === "RESERVED" || status.reason === "TAKEN" ? t(`register.reason${status.reason}`) : status.reason}</Typography.Text>;
  }

  if (register.data && !register.data.auth) {
    const { tenant } = register.data;
    return (
      <AuthCard title={t("register.title")} width={640}>
        <Result status="success" title={t("register.reviewTitle", { name: tenant.name })}
          subTitle={t("register.reviewText", {
            email: register.variables.ownerEmail, url: tenant.url.replace(/^https?:\/\//, ""),
          })}
          extra={<Link href="/"><Button type="primary">{t("gate.goHome")}</Button></Link>} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("register.title")} width={640}
      subtitle={t("register.subtitle")}
      footer={<Typography.Text type="secondary">{t("register.alreadyRegistered")} <Link href="/#sign-in">{t("auth.signIn")}</Link></Typography.Text>}>
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
        <Divider titlePlacement="start" plain style={{ marginTop: 0 }}>{t("register.company")}</Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="companyName" label={t("register.companyName")} rules={[{ required: true, message: t("register.enterCompanyName") }, { max: 150 }]}>
              <Input autoFocus placeholder="Hodan Estates" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label={t("register.webAddress")} required extra={slugHelp}
              validateStatus={status && !status.available && !checking ? "error" : undefined}>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="slug" noStyle normalize={(value: string) => value.toLowerCase()}
                  rules={[{ required: true, message: t("register.chooseAddress") }]}>
                  <Input placeholder="hodan-estates" maxLength={30} />
                </Form.Item>
                <Space.Addon>.{tenantHostSuffix()}</Space.Addon>
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="companyEmail" label={t("register.companyEmail")} rules={[{ required: true, type: "email", message: t("validation.validEmail") }]}>
              <Input placeholder="info@company.so" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="companyPhone" label={t("register.companyPhone")} rules={[{ max: 30 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="country" label={t("common.country")}>
              <Select showSearch={{ optionFilterProp: "label" }} options={countries} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="city" label={t("common.cityOptional")} rules={[{ max: 80 }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Divider titlePlacement="start" plain>{t("register.yourAccount")}</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="ownerFullName" label={t("common.fullName")} rules={[{ required: true, message: t("validation.enterName") }, { max: 150 }]}>
              <Input autoComplete="name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="ownerPhone" label={t("common.phoneOptional")} rules={[{ max: 30 }]}>
              <Input autoComplete="tel" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="ownerEmail" label={t("common.email")} rules={[{ required: true, type: "email", message: t("validation.validEmail") }]}>
              <Input autoComplete="email" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="password" label={t("common.password")} rules={passwordRules(t)}
              extra={t("validation.passwordHelp")}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="confirm" label={t("common.confirmPassword")} dependencies={["password"]} rules={confirmPasswordRule(t, "password")}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" block size="large" loading={register.isPending}>
          {register.isPending ? t("register.creating") : t("register.create")}
        </Button>
      </Form>
    </AuthCard>
  );
}
