"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Switch } from "antd";
import { useEffect, useMemo } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { UnitDetails, UnitRequest, UnitType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { currencySymbol } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { floorLabel, UNIT_TYPE_LABELS } from "@/lib/labels";
import { useAmenities, useEnums, usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { currencyOptions } from "@/lib/reference-data";
import { invalidatePortfolio } from "./invalidate";

type UnitForm = UnitRequest & { propertyId: string };

interface Props {
  open: boolean;
  /** Preselected (and fixed) property when adding from a property page. */
  propertyId?: string;
  buildingId?: string;
  unit?: UnitDetails;
  onClose: () => void;
  onSaved?: (unit: UnitDetails) => void;
}

/** Add a unit or edit one (status is changed separately). */
export function UnitFormDrawer({ open, propertyId, buildingId, unit, onClose, onSaved }: Props) {
  const { api } = useTenant();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { organizationCurrency } = usePortfolioPermissions();
  const { data: enums } = useEnums();
  const { data: amenities } = useAmenities("UNIT");
  const [form] = Form.useForm<UnitForm>();
  const selectedProperty = Form.useWatch("propertyId", form);
  const selectedBuilding = Form.useWatch("buildingId", form);
  const currency = Form.useWatch("currency", form) ?? organizationCurrency;
  const editing = !!unit;
  const fixedProperty = unit?.propertyId ?? propertyId;

  const properties = useQuery({
    queryKey: ["properties", "options"],
    queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }),
    enabled: open && !fixedProperty,
  });
  const buildings = useQuery({
    queryKey: ["buildings", selectedProperty],
    queryFn: () => api.buildings(selectedProperty),
    enabled: open && !!selectedProperty,
  });
  const building = buildings.data?.find((b) => b.id === selectedBuilding);
  const currencies = useMemo(() => currencyOptions(unit?.currency ?? organizationCurrency),
    [unit?.currency, organizationCurrency]);

  useEffect(() => {
    if (!open) {
      return;
    }
    form.resetFields();
    form.setFieldsValue(unit ? {
      ...unit,
      propertyId: unit.propertyId,
      buildingId: unit.buildingId ?? undefined,
    } : {
      propertyId: propertyId,
      buildingId: buildingId,
      floor: 1,
      type: "TWO_BEDROOM",
      bedrooms: 2,
      bathrooms: 1,
      furnished: false,
      currency: organizationCurrency,
    });
  }, [open, unit, propertyId, buildingId, organizationCurrency, form]);

  const save = useMutation({
    mutationFn: ({ propertyId: pid, ...values }: UnitForm) => {
      const body: UnitRequest = { ...values, buildingId: values.buildingId ?? null };
      return unit ? api.updateUnit(unit.id, body) : api.createUnit(pid, body);
    },
    onSuccess: (saved) => {
      message.success(editing ? `Apartment ${saved.unitNumber} saved` : `Apartment ${saved.unitNumber} added`);
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

  const onValuesChange = (changed: Partial<UnitForm>) => {
    if (changed.type && enums) {
      const info = enums.unitTypes.find((t) => t.value === changed.type);
      if (info) {
        form.setFieldValue("bedrooms", info.defaultBedrooms);
      }
    }
    if ("propertyId" in changed) {
      form.setFieldValue("buildingId", undefined);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={editing ? `Edit apartment ${unit.unitNumber}` : "Add apartment"} size={600}
      destroyOnHidden extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>{editing ? "Save" : "Add"}</Button>
        </Space>
      }>
      <Form<UnitForm> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
        onValuesChange={onValuesChange} onFinish={(values) => save.mutate(values)}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="propertyId" label="Property" rules={[{ required: true, message: "Choose a property" }]}>
              <Select disabled={!!fixedProperty} showSearch={{ optionFilterProp: "label" }}
                placeholder="Choose a property" loading={properties.isFetching}
                options={fixedProperty && !properties.data ? [{ value: fixedProperty, label: unit?.propertyName ?? "This property" }]
                  : (properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="buildingId" label="Flat" extra={buildings.data?.length ? undefined : "No flats: the apartment belongs to the property directly."}>
              <Select allowClear placeholder="No flat" disabled={!selectedProperty}
                options={(buildings.data ?? []).filter((b) => b.status === "ACTIVE")
                  .map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="unitNumber" label="Apartment number" rules={[{ required: true, whitespace: true, message: "Enter a number" }, { max: 20 }]}>
              <Input placeholder="101" autoFocus={!editing} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="floor" label="Floor" rules={[{ required: true }]}
              extra={building ? `${floorLabel(-building.basementFloors)} to ${floorLabel(building.floorsCount)}` : "0 = ground floor"}>
              <InputNumber style={{ width: "100%" }} min={building ? -building.basementFloors : -20}
                max={building ? building.floorsCount : 200} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={(enums?.unitTypes ?? []).map((t) => ({ value: t.value, label: UNIT_TYPE_LABELS[t.value as UnitType] }))} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bedrooms" label="Bedrooms">
              <InputNumber min={0} max={50} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bathrooms" label="Bathrooms">
              <InputNumber min={0} max={50} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="sizeSqm" label="Size (m²)">
              <InputNumber min={1} max={999999} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="baseRent" label="Monthly rent" rules={[{ required: true, message: "Enter the rent" }]}>
              <InputNumber min={0} style={{ width: "100%" }} prefix={currencySymbol(currency)} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="currency" label="Currency">
              <Select showSearch={{ optionFilterProp: "label" }} options={currencies} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="depositAmount" label="Deposit">
              <InputNumber min={0} style={{ width: "100%" }} prefix={currencySymbol(currency)} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="furnished" label="Furnished" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          {!editing && (
            <Col xs={24}>
              <Form.Item name="amenityIds" label="Amenities">
                <Select mode="multiple" optionFilterProp="label" placeholder="Balcony, kitchen, air conditioning…"
                  options={(amenities ?? []).map((a) => ({ value: a.id, label: a.name }))} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24}>
            <Form.Item name="notes" label="Notes" rules={[{ max: 5000 }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
