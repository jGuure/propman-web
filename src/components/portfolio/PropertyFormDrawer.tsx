"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, AutoComplete, Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space } from "antd";
import { useEffect, useMemo } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { PropertyDetails, PropertyRequest } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { PROPERTY_TYPES, SOMALI_CITIES, useLabels } from "@/lib/labels";
import { useAmenities } from "@/lib/portfolio-hooks";
import { countryOptions } from "@/lib/reference-data";
import { invalidatePortfolio } from "./invalidate";

interface Props {
  open: boolean;
  property?: PropertyDetails;
  onClose: () => void;
  onSaved?: (property: PropertyDetails) => void;
}

/** Create a property (no `property`) or edit one. */
export function PropertyFormDrawer({ open, property, onClose, onSaved }: Props) {
  const { api } = useTenant();
  const { t, lang } = useT();
  const labels = useLabels();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PropertyRequest>();
  const { data: amenities } = useAmenities("PROPERTY");
  const countries = useMemo(() => countryOptions(property?.country, lang), [property?.country, lang]);
  const editing = !!property;

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(property ? {
        ...property,
        status: property.status === "ARCHIVED" ? undefined : property.status,
      } : { type: "RESIDENTIAL", country: "SO", city: "Mogadishu" });
    }
  }, [open, property, form]);

  const save = useMutation({
    mutationFn: (values: PropertyRequest) => (property ? api.updateProperty(property.id, values) : api.createProperty(values)),
    onSuccess: (saved) => {
      message.success(editing ? t("properties.saved") : t("properties.created", { name: saved.name, code: saved.code }));
      invalidatePortfolio(queryClient);
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Drawer open={open} onClose={onClose} title={editing ? t("properties.formEdit", { name: property.name }) : t("properties.formAdd")} size={560}
      destroyOnHidden extra={
        <Space>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>
            {editing ? t("common.save") : t("common.create")}
          </Button>
        </Space>
      }>
      <Form<PropertyRequest> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
        onFinish={(values) => save.mutate(values)}>
        <Form.Item name="name" label={t("common.name")} rules={[{ required: true, message: t("validation.enterName") }, { max: 150 }]}>
          <Input placeholder="Hodan Towers" autoFocus />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="type" label={t("common.type")} rules={[{ required: true }]}>
              <Select options={PROPERTY_TYPES.map((type) => ({ value: type, label: labels.propertyType(type) }))} />
            </Form.Item>
          </Col>
          {editing && (
            <Col xs={24} sm={12}>
              <Form.Item name="status" label={t("common.status")} extra={t("properties.archiveFromPage")}>
                <Select options={[{ value: "ACTIVE", label: labels.propertyStatus("ACTIVE") }, { value: "INACTIVE", label: labels.propertyStatus("INACTIVE") }]} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12}>
            <Form.Item name="country" label={t("common.country")}>
              <Select showSearch={{ optionFilterProp: "label" }} options={countries} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="city" label={t("common.city")} rules={[{ required: true, message: t("validation.enterCity") }, { max: 80 }]}>
              <AutoComplete options={SOMALI_CITIES.map((c) => ({ value: c }))}
                filterOption={(input, option) => (option?.value ?? "").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="district" label={t("common.district")} rules={[{ max: 80 }]}>
              <Input placeholder="Hodan" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="yearBuilt" label={t("properties.yearBuilt")}>
              <InputNumber min={1800} max={2100} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="address" label={t("common.address")} rules={[{ max: 255 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="latitude" label={t("properties.latitude")}>
              <InputNumber min={-90} max={90} step={0.0001} style={{ width: "100%" }} placeholder="2.0469" />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="longitude" label={t("properties.longitude")}>
              <InputNumber min={-180} max={180} step={0.0001} style={{ width: "100%" }} placeholder="45.3182" />
            </Form.Item>
          </Col>
          {!editing && (
            <Col xs={24}>
              <Form.Item name="amenityIds" label={t("apartments.amenities")}>
                <Select mode="multiple" optionFilterProp="label" placeholder={t("properties.amenitiesPlaceholder")}
                  options={(amenities ?? []).map((a) => ({ value: a.id, label: a.name }))} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24}>
            <Form.Item name="description" label={t("common.description")} rules={[{ max: 5000 }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
