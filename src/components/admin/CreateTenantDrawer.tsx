"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Col, Divider, Drawer, Form, Input, Row, Select, Space, Switch, Typography } from "antd";
import { useRouter } from "nextjs-toploader/app";
import { useMemo, useRef } from "react";
import { errorMessage, hasFieldErrors } from "@/lib/api/errors";
import type { RegisterRequest } from "@/lib/api/types";
import { usePlatform } from "@/lib/auth/platform-context";
import { tenantHostSuffix } from "@/lib/config";
import { applyFieldErrors, suggestSlug } from "@/lib/forms";
import { countryOptions } from "@/lib/reference-data";

type CreateForm = RegisterRequest & { keepInReview: boolean };

const FIELDS = ["companyName", "slug", "companyEmail", "companyPhone", "country", "city", "ownerFullName",
  "ownerEmail", "ownerPhone", "password"] as const;
/** Validation errors come back as "organization.slug"; the form fields are flat. */
const FIELD_MAP = Object.fromEntries(FIELDS.map((f) => [`organization.${f}`, f]));

/** A platform admin creates an organization and its owner (mount it only while open). */
export function CreateTenantDrawer({ onClose }: { onClose: () => void }) {
  const { api } = usePlatform();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form] = Form.useForm<CreateForm>();
  const slugEdited = useRef(false);
  const countries = useMemo(() => countryOptions(undefined, "en"), []);
  const create = useMutation({
    mutationFn: ({ keepInReview, ...organization }: CreateForm) => api.createTenant(organization, keepInReview),
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
      message.success(tenant.status === "PENDING_REVIEW"
        ? `${tenant.name} is created and waiting for review`
        : `${tenant.name} is created and active`);
      onClose();
      router.push(`/tenants/${tenant.id}`);
    },
    onError: (error) => applyFieldErrors(form, error, FIELD_MAP),
  });

  return (
    <Drawer open title="New organization" size={560} onClose={onClose} destroyOnHidden
      extra={<Button type="primary" loading={create.isPending} onClick={() => form.submit()}>Create</Button>}>
      {create.error && !hasFieldErrors(create.error) && (
        <Alert type="error" showIcon title={errorMessage(create.error)} style={{ marginBottom: 16 }} />
      )}
      <Form<CreateForm> form={form} layout="vertical" requiredMark={false} disabled={create.isPending}
        initialValues={{ country: "SO", keepInReview: false }} onFinish={(values) => create.mutate(values)}
        onValuesChange={(changed: Partial<CreateForm>) => {
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
              <Input autoFocus placeholder="Waberi Tower" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Web address" required>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="slug" noStyle normalize={(value: string) => value.toLowerCase()}
                  rules={[{ required: true, message: "Choose an address" }]}>
                  <Input placeholder="waberi-tower" maxLength={30} />
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
        <Divider titlePlacement="start" plain>Owner</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="ownerFullName" label="Full name" rules={[{ required: true, message: "Enter a name" }, { max: 150 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="ownerPhone" label="Phone (optional)" rules={[{ max: 30 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="ownerEmail" label="Email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
              <Input autoComplete="off" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="password" label="First password"
              extra="Give it to the owner; they can change it after signing in."
              rules={[{ required: true, message: "Enter a password" }, { min: 8, message: "At least 8 characters" }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
        <Divider titlePlacement="start" plain>Approval</Divider>
        <Form.Item name="keepInReview" valuePropName="checked" style={{ marginBottom: 4 }}>
          <Switch checkedChildren="Keep in review" unCheckedChildren="Active now" />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Active now: the owner can sign in straight away. Keep in review: it waits in the review list until you approve it.
        </Typography.Text>
      </Form>
    </Drawer>
  );
}
