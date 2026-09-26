"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Switch } from "antd";
import { useEffect } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { UnitDetails, UnitRequest, UnitType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { CURRENCY } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { useLabels } from "@/lib/labels";
import { useAmenities, useEnums } from "@/lib/portfolio-hooks";
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
  const { t } = useT();
  const labels = useLabels();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: enums } = useEnums();
  const { data: amenities } = useAmenities("UNIT");
  const [form] = Form.useForm<UnitForm>();
  const selectedProperty = Form.useWatch("propertyId", form);
  const selectedBuilding = Form.useWatch("buildingId", form);
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
    });
  }, [open, unit, propertyId, buildingId, form]);

  const save = useMutation({
    mutationFn: ({ propertyId: pid, ...values }: UnitForm) => {
      const body: UnitRequest = { ...values, buildingId: values.buildingId ?? null, currency: CURRENCY };
      return unit ? api.updateUnit(unit.id, body) : api.createUnit(pid, body);
    },
    onSuccess: (saved) => {
      message.success(t(editing ? "apartments.savedMsg" : "apartments.addedMsg", { number: saved.unitNumber }));
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
      const info = enums.unitTypes.find((type) => type.value === changed.type);
      if (info) {
        form.setFieldValue("bedrooms", info.defaultBedrooms);
      }
    }
    if ("propertyId" in changed) {
      form.setFieldValue("buildingId", undefined);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={editing ? t("apartments.formEdit", { number: unit.unitNumber }) : t("apartments.formAdd")} size={600}
      destroyOnHidden extra={
        <Space>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>{editing ? t("common.save") : t("common.add")}</Button>
        </Space>
      }>
      <Form<UnitForm> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
        onValuesChange={onValuesChange} onFinish={(values) => save.mutate(values)}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="propertyId" label={t("apartments.property")} rules={[{ required: true, message: t("validation.chooseProperty") }]}>
              <Select disabled={!!fixedProperty} showSearch={{ optionFilterProp: "label" }}
                placeholder={t("validation.chooseProperty")} loading={properties.isFetching}
                options={fixedProperty && !properties.data ? [{ value: fixedProperty, label: unit?.propertyName ?? "" }]
                  : (properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="buildingId" label={t("apartments.flat")} extra={buildings.data?.length ? undefined : t("apartments.noFlatsHelp")}>
              <Select allowClear placeholder={t("apartments.noFlat")} disabled={!selectedProperty}
                options={(buildings.data ?? []).filter((b) => b.status === "ACTIVE")
                  .map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="unitNumber" label={t("apartments.number")} rules={[{ required: true, whitespace: true, message: t("validation.enterNumber") }, { max: 20 }]}>
              <Input placeholder="101" autoFocus={!editing} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="floor" label={t("apartments.floor")} rules={[{ required: true }]}
              extra={building ? t("explorer.floorsRange", { from: labels.floor(-building.basementFloors), to: labels.floor(building.floorsCount) }) : t("floor.groundHelp")}>
              <InputNumber style={{ width: "100%" }} min={building ? -building.basementFloors : -20}
                max={building ? building.floorsCount : 200} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="type" label={t("common.type")} rules={[{ required: true }]}>
              <Select options={(enums?.unitTypes ?? []).map((type) => ({ value: type.value, label: labels.unitType(type.value as UnitType) }))} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bedrooms" label={t("apartments.bedrooms")}>
              <InputNumber min={0} max={50} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bathrooms" label={t("apartments.bathrooms")}>
              <InputNumber min={0} max={50} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="sizeSqm" label={t("common.sizeSqm")}>
              <InputNumber min={1} max={999999} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="baseRent" label={t("common.monthlyRent")} rules={[{ required: true, message: t("validation.enterRent") }]}
              extra={t("common.currencyNote")}>
              <InputNumber min={0} style={{ width: "100%" }} prefix="$" />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="depositAmount" label={t("common.deposit")}>
              <InputNumber min={0} style={{ width: "100%" }} prefix="$" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="furnished" label={t("apartments.furnished")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          {!editing && (
            <Col xs={24}>
              <Form.Item name="amenityIds" label={t("apartments.amenities")}>
                <Select mode="multiple" optionFilterProp="label" placeholder={t("apartments.amenitiesPlaceholder")}
                  options={(amenities ?? []).map((a) => ({ value: a.id, label: a.name }))} />
              </Form.Item>
            </Col>
          )}
          <Col xs={24}>
            <Form.Item name="notes" label={t("common.notes")} rules={[{ max: 5000 }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
