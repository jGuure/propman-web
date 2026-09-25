"use client";

import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Flex, Form, Input, Popconfirm, Row, Select, Skeleton, Typography, Upload } from "antd";
import { useEffect, useMemo } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageHeader } from "@/components/PageHeader";
import { errorMessage } from "@/lib/api/errors";
import type { Organization, UpdateOrganizationRequest } from "@/lib/api/types";
import { useCan, useTenant } from "@/lib/auth/tenant-context";
import { tenantUrl } from "@/lib/config";
import { applyFieldErrors } from "@/lib/forms";
import { countryOptions, currencyOptions, timezoneOptions } from "@/lib/reference-data";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function OrganizationPage() {
  const { api } = useTenant();
  const canEdit = useCan("organization:update");
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UpdateOrganizationRequest>();
  const organization = useQuery({ queryKey: ["organization"], queryFn: api.organization });
  const timezones = useMemo(() => timezoneOptions(), []);

  useEffect(() => {
    if (organization.data) {
      form.setFieldsValue(organization.data);
    }
  }, [organization.data, form]);

  const refresh = (updated: Organization) => {
    queryClient.setQueryData(["organization"], updated);
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["branding"] });
  };

  const save = useMutation({
    mutationFn: (values: UpdateOrganizationRequest) => api.updateOrganization(values),
    onSuccess: (updated) => {
      refresh(updated);
      message.success("Organization saved");
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadLogo(file),
    onSuccess: (updated) => {
      refresh(updated);
      message.success("Logo updated");
    },
    onError: (error) => message.error(errorMessage(error)),
  });
  const removeLogo = useMutation({
    mutationFn: () => api.deleteLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      message.success("Logo removed");
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (organization.isPending) {
    return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>;
  }
  if (organization.error) {
    return <Alert type="error" showIcon title={errorMessage(organization.error)} />;
  }
  const org = organization.data;

  return (
    <>
      <PageHeader title="Organization" description="Your company profile, shown to your team and on the sign-in page." />
      {!canEdit && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Only owners can change the organization profile." />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Logo">
            <Flex vertical align="center" gap={16}>
              <BrandLogo name={org.name} logoUrl={org.logoUrl} size={112} />
              {canEdit && (
                <Flex gap={8} wrap justify="center">
                  <Upload accept={LOGO_TYPES.join(",")} showUploadList={false}
                    beforeUpload={(file) => {
                      if (!LOGO_TYPES.includes(file.type)) {
                        message.error("Use a PNG, JPEG or WebP image");
                      } else if (file.size > MAX_LOGO_BYTES) {
                        message.error("The logo must be at most 2 MB");
                      } else {
                        upload.mutate(file);
                      }
                      return false;
                    }}>
                    <Button icon={<UploadOutlined />} loading={upload.isPending}>
                      {org.logoUrl ? "Replace" : "Upload"}
                    </Button>
                  </Upload>
                  {org.logoUrl && (
                    <Popconfirm title="Remove the logo?" onConfirm={() => removeLogo.mutate()} okText="Remove">
                      <Button icon={<DeleteOutlined />} danger loading={removeLogo.isPending}>Remove</Button>
                    </Popconfirm>
                  )}
                </Flex>
              )}
              <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: 13 }}>
                PNG, JPEG or WebP, up to 2 MB. A square image works best.
              </Typography.Text>
            </Flex>
          </Card>
          <Card title="Web address" style={{ marginTop: 16 }}>
            <Typography.Paragraph copyable style={{ marginBottom: 4 }}>{tenantUrl(org.slug)}</Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>The address cannot be changed.</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Profile">
            <Form<UpdateOrganizationRequest> form={form} layout="vertical" requiredMark={false}
              disabled={!canEdit || save.isPending} onFinish={(values) => save.mutate(values)}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label="Display name" rules={[{ required: true, message: "Enter a name" }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="legalName" label="Legal name" rules={[{ max: 150 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="email" label="Contact email" rules={[{ type: "email", message: "Enter a valid email" }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label="Phone" rules={[{ max: 30 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="country" label="Country" rules={[{ required: true }]}>
                    <Select showSearch={{ optionFilterProp: "label" }} options={countryOptions(org.country)} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="city" label="City" rules={[{ max: 80 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="address" label="Address" rules={[{ max: 255 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                    <Select showSearch={{ optionFilterProp: "label" }} options={currencyOptions(org.currency)} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="timezone" label="Time zone" rules={[{ required: true }]}>
                    <Select showSearch={{ optionFilterProp: "label" }} options={timezones} />
                  </Form.Item>
                </Col>
              </Row>
              {canEdit && (
                <Flex justify="end">
                  <Button type="primary" htmlType="submit" loading={save.isPending}>Save changes</Button>
                </Flex>
              )}
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
}
