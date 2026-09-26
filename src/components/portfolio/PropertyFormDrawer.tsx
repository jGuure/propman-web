"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, AutoComplete, Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space } from "antd";
import { useEffect, useMemo } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { PropertyDetails, PropertyRequest, PropertyType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { PROPERTY_TYPE_LABELS, SOMALI_CITIES } from "@/lib/labels";
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
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PropertyRequest>();
  const { data: amenities } = useAmenities("PROPERTY");
  const countries = useMemo(() => countryOptions(property?.country), [property?.country]);
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
      message.success(editing ? "Property saved" : `${saved.name} created (${saved.code})`);
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
    <Drawer open={open} onClose={onClose} title={editing ? `Edit ${property.name}` : "Add property"} size={560}
      destroyOnHidden extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>
            {editing ? "Save" : "Create"}
          </Button>
        </Space>
      }>
      <Form<PropertyRequest> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
        onFinish={(values) => save.mutate(values)}>
        <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter a name" }, { max: 150 }]}>
          <Input placeholder="Hodan Towers" autoFocus />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[])
                .map((t) => ({ value: t, label: PROPERTY_TYPE_LABELS[t] }))} />
            </Form.Item>
          </Col>
          {editing && (
            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Status" extra="Archive from the property page.">
                <Select options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12}>
            <Form.Item name="country" label="Country">
              <Select showSearch={{ optionFilterProp: "label" }} options={countries} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="city" label="City" rules={[{ required: true, message: "Enter a city" }, { max: 80 }]}>
              <AutoComplete options={SOMALI_CITIES.map((c) => ({ value: c }))}
                filterOption={(input, option) => (option?.value ?? "").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="district" label="District" rules={[{ max: 80 }]}>
              <Input placeholder="Hodan" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="yearBuilt" label="Year built">
              <InputNumber min={1800} max={2100} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="address" label="Address" rules={[{ max: 255 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="latitude" label="Latitude">
              <InputNumber min={-90} max={90} step={0.0001} style={{ width: "100%" }} placeholder="2.0469" />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="longitude" label="Longitude">
              <InputNumber min={-180} max={180} step={0.0001} style={{ width: "100%" }} placeholder="45.3182" />
            </Form.Item>
          </Col>
          {!editing && (
            <Col xs={24}>
              <Form.Item name="amenityIds" label="Amenities">
                <Select mode="multiple" optionFilterProp="label" placeholder="Parking, generator, lift…"
                  options={(amenities ?? []).map((a) => ({ value: a.id, label: a.name }))} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24}>
            <Form.Item name="description" label="Description" rules={[{ max: 5000 }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
