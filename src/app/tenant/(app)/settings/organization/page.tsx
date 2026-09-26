"use client";

import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Flex, Form, Input, InputNumber, Popconfirm, Row, Select, Skeleton, Typography, Upload } from "antd";
import { useEffect, useMemo } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageHeader } from "@/components/PageHeader";
import { useT } from "@/i18n/provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { Organization, UpdateOrganizationRequest } from "@/lib/api/types";
import { useCan, useTenant } from "@/lib/auth/tenant-context";
import { compressImage } from "@/lib/compressImage";
import { tenantUrl } from "@/lib/config";
import { CURRENCY } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { countryOptions, timezoneOptions } from "@/lib/reference-data";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function OrganizationPage() {
  const { api } = useTenant();
  const canEdit = useCan("organization:update");
  const { t, lang } = useT();
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
      message.success(t("organization.saved"));
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => api.uploadLogo(await compressImage(file, { maxWidthOrHeight: 512 })),
    onSuccess: (updated) => {
      refresh(updated);
      message.success(t("organization.logoUpdated"));
    },
    onError: (error) => message.error(isApiError(error) ? errorMessage(error) : error.message),
  });
  const removeLogo = useMutation({
    mutationFn: () => api.deleteLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      message.success(t("organization.logoRemoved"));
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
      <PageHeader title={t("organization.title")} description={t("organization.subtitle")} />
      {!canEdit && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title={t("organization.onlyOwners")} />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title={t("organization.logo")}>
            <Flex vertical align="center" gap={16}>
              <BrandLogo name={org.name} logoUrl={org.logoUrl} size={112} />
              {canEdit && (
                <Flex gap={8} wrap justify="center">
                  <Upload accept={LOGO_TYPES.join(",")} showUploadList={false}
                    beforeUpload={(file) => {
                      if (!LOGO_TYPES.includes(file.type)) {
                        message.error(t("errors.imageType"));
                      } else {
                        upload.mutate(file);
                      }
                      return false;
                    }}>
                    <Button icon={<UploadOutlined />} loading={upload.isPending}>
                      {upload.isPending ? t("organization.optimizing") : org.logoUrl ? t("organization.replace") : t("organization.upload")}
                    </Button>
                  </Upload>
                  {org.logoUrl && (
                    <Popconfirm title={t("organization.removeLogoConfirm")} onConfirm={() => removeLogo.mutate()} okText={t("common.remove")}>
                      <Button icon={<DeleteOutlined />} danger loading={removeLogo.isPending}>{t("common.remove")}</Button>
                    </Popconfirm>
                  )}
                </Flex>
              )}
              <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: 13 }}>
                {t("organization.logoHelp")}
              </Typography.Text>
            </Flex>
          </Card>
          <Card title={t("organization.webAddress")} style={{ marginTop: 16 }}>
            <Typography.Paragraph copyable style={{ marginBottom: 4 }}>{tenantUrl(org.slug)}</Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("organization.addressFixed")}</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title={t("organization.profile")}>
            <Form<UpdateOrganizationRequest> form={form} layout="vertical" requiredMark={false}
              disabled={!canEdit || save.isPending} onFinish={(values) => save.mutate({ ...values, currency: CURRENCY })}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label={t("organization.displayName")} rules={[{ required: true, message: t("validation.enterName") }, { max: 150 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="legalName" label={t("organization.legalName")} rules={[{ max: 150 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="email" label={t("organization.contactEmail")} rules={[{ type: "email", message: t("validation.validEmail") }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label={t("common.phone")} rules={[{ max: 30 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="country" label={t("common.country")} rules={[{ required: true }]}>
                    <Select showSearch={{ optionFilterProp: "label" }} options={countryOptions(org.country, lang)} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="city" label={t("common.city")} rules={[{ max: 80 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="address" label={t("common.address")} rules={[{ max: 255 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label={t("organization.currency")}>
                    <Input value={t("organization.currencyFixed")} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="rentDueDay" label={t("organization.rentDueDay")} extra={t("organization.rentDueDayHelp")}
                    rules={[{ required: true, message: t("validation.required") }]}>
                    <InputNumber min={1} max={28} precision={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="timezone" label={t("organization.timezone")} rules={[{ required: true }]}>
                    <Select showSearch={{ optionFilterProp: "label" }} options={timezones} />
                  </Form.Item>
                </Col>
              </Row>
              {canEdit && (
                <Flex justify="end">
                  <Button type="primary" htmlType="submit" loading={save.isPending}>{t("common.saveChanges")}</Button>
                </Flex>
              )}
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
}
