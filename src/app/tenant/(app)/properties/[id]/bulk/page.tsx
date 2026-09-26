"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Descriptions, Flex, Form, Input, InputNumber, Result, Row, Select, Skeleton, Space, Steps, Switch, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { BulkCreateResult, BulkPreview, BulkUnitsRequest, UnitType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { currencySymbol, formatMoney } from "@/lib/format";
import { floorLabel, UNIT_TYPE_LABELS } from "@/lib/labels";
import { useAmenities, useEnums, usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { currencyOptions } from "@/lib/reference-data";

type WizardForm = Omit<BulkUnitsRequest, "defaults"> & BulkUnitsRequest["defaults"];

const STEP_FIELDS: (keyof WizardForm)[][] = [
  ["buildingId", "floorFrom", "floorTo", "unitsPerFloor"],
  ["numberPattern", "startIndex"],
  ["type", "bedrooms", "bathrooms", "sizeSqm", "furnished", "baseRent", "currency", "depositAmount", "amenityIds"],
  [],
];

const TOKENS = [
  { token: "{floor}", help: "floor number" },
  { token: "{index:02}", help: "01, 02 …" },
  { token: "{index}", help: "1, 2 …" },
  { token: "{letter}", help: "A, B, C …" },
  { token: "{building}", help: "building code" },
];

/** Pattern problems come back as a field error on numberPattern; show them as a sentence. */
function previewError(error: unknown): string {
  if (isApiError(error) && error.fieldErrors.length > 0) {
    const { field, message } = error.fieldErrors[0];
    const label = field === "numberPattern" ? "The number pattern" : field === "floorTo" ? "The last floor" : field;
    return `${label} ${message}.`;
  }
  return errorMessage(error);
}

function toRequest(v: WizardForm): BulkUnitsRequest {
  return {
    buildingId: v.buildingId ?? null,
    floorFrom: v.floorFrom,
    floorTo: v.floorTo,
    unitsPerFloor: v.unitsPerFloor,
    numberPattern: v.numberPattern,
    startIndex: v.startIndex,
    defaults: {
      type: v.type ?? "TWO_BEDROOM", bedrooms: v.bedrooms, bathrooms: v.bathrooms, sizeSqm: v.sizeSqm,
      furnished: v.furnished, baseRent: v.baseRent ?? 0, currency: v.currency, depositAmount: v.depositAmount,
      amenityIds: v.amenityIds ?? [],
    },
  };
}

function BulkUnitsPage() {
  const { id } = useParams<{ id: string }>();
  const preselectedFlat = useSearchParams().get("flat");
  const { api } = useTenant();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canManage, organizationCurrency } = usePortfolioPermissions();
  const { data: enums } = useEnums();
  const { data: amenities } = useAmenities("UNIT");
  const [form] = Form.useForm<WizardForm>();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<BulkCreateResult>();
  const property = useQuery({ queryKey: ["property", id], queryFn: () => api.property(id) });
  const values = Form.useWatch([], form) as WizardForm | undefined;
  const buildings = (property.data?.buildings ?? []).filter((b) => b.status === "ACTIVE");
  const building = buildings.find((b) => b.id === values?.buildingId);
  const currencies = useMemo(() => currencyOptions(organizationCurrency), [organizationCurrency]);

  useEffect(() => {
    if (property.data) {
      const active = property.data.buildings.filter((b) => b.status === "ACTIVE");
      const first = active.find((b) => b.id === preselectedFlat) ?? active[0];
      form.setFieldsValue({
        buildingId: first?.id, floorFrom: first ? 1 : 0, floorTo: first ? first.floorsCount : 0, unitsPerFloor: 4,
        numberPattern: first ? "{floor}{index:02}" : "{index}", startIndex: 1, type: "TWO_BEDROOM", bedrooms: 2,
        bathrooms: 1, furnished: false, currency: organizationCurrency, amenityIds: [],
      });
    }
  }, [property.data, organizationCurrency, form, preselectedFlat]);

  const total = values ? Math.max(0, (values.floorTo - values.floorFrom + 1) * (values.unitsPerFloor ?? 0)) : 0;
  const previewKey = values ? JSON.stringify([values.buildingId, values.floorFrom, values.floorTo, values.unitsPerFloor,
    values.numberPattern, values.startIndex]) : "";
  const preview = useQuery<BulkPreview>({
    queryKey: ["bulk-preview", id, previewKey],
    queryFn: () => api.bulkPreview(id, toRequest(values!)),
    enabled: step >= 1 && !!values?.numberPattern && total > 0 && total <= (enums?.maxBulkUnits ?? 500),
    retry: false,
  });
  const create = useMutation({
    mutationFn: () => api.bulkCreate(id, toRequest(form.getFieldsValue(true))),
    onSuccess: (r) => { setResult(r); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (property.isPending) {
    return <Card><Skeleton active /></Card>;
  }
  if (property.error) {
    return <Alert type="error" showIcon title={errorMessage(property.error)} />;
  }
  if (!canManage || property.data.status === "ARCHIVED") {
    return <Result status="403" title="Apartments cannot be added here" extra={<Link href={`/properties/${id}`}><Button>Back</Button></Link>} />;
  }
  if (result) {
    return (
      <Card>
        <Result status="success" title={`${result.created} apartments created`}
          subTitle={`They are vacant and ready in ${building ? building.name : property.data.name}.`}
          extra={[
            <Link key="view" href={`/properties/${id}${result.buildingId ? `?flat=${result.buildingId}` : ""}`}><Button type="primary">See them in the building</Button></Link>,
            <Button key="more" onClick={() => { setResult(undefined); setStep(0); }}>Add more apartments</Button>,
          ]} />
      </Card>
    );
  }

  const next = async () => {
    try {
      await form.validateFields(STEP_FIELDS[step]);
      setStep(step + 1);
    } catch {
      // field errors are shown on the form
    }
  };
  const floorsByNumber = new Map<number, BulkPreview["units"]>();
  preview.data?.units.forEach((u) => floorsByNumber.set(u.floor, [...(floorsByNumber.get(u.floor) ?? []), u]));
  const conflicts = preview.data?.conflicts ?? [];
  const minFloor = building ? -building.basementFloors : -20;
  const maxFloor = building ? building.floorsCount : 200;

  const previewPanel = (
    <Card size="small" title={`Preview${preview.data ? ` · ${preview.data.count} units` : ""}`} style={{ marginTop: 8 }}>
      {preview.isFetching && !preview.data && <Skeleton active paragraph={{ rows: 3 }} />}
      {preview.error && <Alert type="error" showIcon title={previewError(preview.error)} />}
      {conflicts.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          title={`${conflicts.length} number${conflicts.length === 1 ? " already exists" : "s already exist"} here`}
          description="Change the pattern, start number or floors. Creating is blocked while there are conflicts." />
      )}
      {preview.data && (
        <Flex vertical gap={6} style={{ maxHeight: 320, overflow: "auto" }}>
          {[...floorsByNumber.entries()].sort((a, b) => b[0] - a[0]).map(([floor, units]) => (
            <Flex key={floor} gap={8} align="center">
              <Typography.Text type="secondary" style={{ width: 84, fontSize: 13 }}>{floorLabel(floor)}</Typography.Text>
              <Flex wrap gap={4}>
                {units.map((u) => <Tag key={u.unitNumber} color={u.conflict ? "red" : "green"}>{u.unitNumber}</Tag>)}
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );

  return (
    <>
      <Link href={`/properties/${id}`}><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0 }}>{property.data.name}</Button></Link>
      <Typography.Title level={3} style={{ marginTop: 4 }}>Add many apartments</Typography.Title>
      <Card>
        <Steps current={step} style={{ marginBottom: 24 }} items={[
          { title: "Floors" }, { title: "Numbering" }, { title: "Details" }, { title: "Review" },
        ]} />
        <Form<WizardForm> form={form} layout="vertical" requiredMark={false} preserve>
          <div style={{ display: step === 0 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="buildingId" label="Flat"
                  extra={buildings.length === 0 ? "This property has no flats; apartments belong to the property." : undefined}>
                  <Select allowClear placeholder="No flat" options={buildings.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                    onChange={(v) => {
                      const b = buildings.find((x) => x.id === v);
                      form.setFieldsValue(b ? { floorFrom: 1, floorTo: b.floorsCount } : { floorFrom: 0, floorTo: 0 });
                    }} />
                </Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="floorFrom" label="From floor" rules={[{ required: true }]}>
                  <InputNumber min={minFloor} max={maxFloor} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="floorTo" label="To floor" dependencies={["floorFrom"]} rules={[{ required: true },
                  ({ getFieldValue }) => ({ validator: (_, v) => (v >= getFieldValue("floorFrom") ? Promise.resolve()
                    : Promise.reject(new Error("Must be ≥ from floor"))) })]}>
                  <InputNumber min={minFloor} max={maxFloor} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="unitsPerFloor" label="Apartments per floor" rules={[{ required: true }]}>
                  <InputNumber min={1} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Typography.Text type={total > (enums?.maxBulkUnits ?? 500) ? "danger" : "secondary"}>
              {total} apartments will be created{total > (enums?.maxBulkUnits ?? 500) ? ` — the maximum is ${enums?.maxBulkUnits ?? 500} at once` : ""}.
              {building && ` ${building.name} has ${floorLabel(minFloor).toLowerCase()} to ${floorLabel(maxFloor).toLowerCase()}.`}
            </Typography.Text>
          </div>
          <div style={{ display: step === 1 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="numberPattern" label="Number pattern" rules={[{ required: true, whitespace: true }, { max: 60 }]}
                  extra="Click a token to add it. Example: {floor}{index:02} gives 101, 102 … 201.">
                  <Input />
                </Form.Item>
                <Flex wrap gap={6} style={{ marginBottom: 16 }}>
                  {TOKENS.filter((t) => t.token !== "{building}" || building).map((t) => (
                    <Button key={t.token} size="small" onClick={() => form.setFieldValue("numberPattern", `${values?.numberPattern ?? ""}${t.token}`)}>
                      {t.token} <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.help}</Typography.Text>
                    </Button>
                  ))}
                </Flex>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="startIndex" label="First number on each floor">
                  <InputNumber min={0} max={999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            {step === 1 && previewPanel}
          </div>
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                  <Select onChange={(t: UnitType) => form.setFieldValue("bedrooms", enums?.unitTypes.find((x) => x.value === t)?.defaultBedrooms)}
                    options={(enums?.unitTypes ?? []).map((t) => ({ value: t.value, label: UNIT_TYPE_LABELS[t.value] }))} />
                </Form.Item>
              </Col>
              <Col xs={8} md={5}><Form.Item name="bedrooms" label="Bedrooms"><InputNumber min={0} max={50} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={8} md={5}><Form.Item name="bathrooms" label="Bathrooms"><InputNumber min={0} max={50} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={8} md={6}><Form.Item name="sizeSqm" label="Size (m²)"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}>
                <Form.Item name="baseRent" label="Monthly rent" rules={[{ required: true, message: "Enter the rent" }]}>
                  <InputNumber min={0} style={{ width: "100%" }} prefix={currencySymbol(values?.currency ?? organizationCurrency)} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="currency" label="Currency"><Select showSearch={{ optionFilterProp: "label" }} options={currencies} /></Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="depositAmount" label="Deposit">
                  <InputNumber min={0} style={{ width: "100%" }} prefix={currencySymbol(values?.currency ?? organizationCurrency)} />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="amenityIds" label="Amenities">
                  <Select mode="multiple" optionFilterProp="label" options={(amenities ?? []).map((a) => ({ value: a.id, label: a.name }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="furnished" label="Furnished" valuePropName="checked"><Switch /></Form.Item>
              </Col>
            </Row>
          </div>
          {step === 3 && values && (
            <>
              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Flat">{building?.name ?? "No flat"}</Descriptions.Item>
                <Descriptions.Item label="Floors">{floorLabel(values.floorFrom)} – {floorLabel(values.floorTo)}</Descriptions.Item>
                <Descriptions.Item label="Apartments">{total} ({values.unitsPerFloor} per floor)</Descriptions.Item>
                <Descriptions.Item label="Numbers">{preview.data ? `${preview.data.units[0]?.unitNumber} … ${preview.data.units.at(-1)?.unitNumber}` : values.numberPattern}</Descriptions.Item>
                <Descriptions.Item label="Type">{UNIT_TYPE_LABELS[values.type]} · {values.bedrooms ?? 0} bed / {values.bathrooms ?? 0} bath</Descriptions.Item>
                <Descriptions.Item label="Rent">{formatMoney(values.baseRent, values.currency ?? organizationCurrency)} per month</Descriptions.Item>
              </Descriptions>
              {previewPanel}
            </>
          )}
        </Form>
        <Flex justify="space-between" style={{ marginTop: 24 }}>
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          <Space>
            {step < 3 && (
              <Button type="primary" onClick={next}
                disabled={(step === 0 && (total === 0 || total > (enums?.maxBulkUnits ?? 500))) || (step === 1 && (!preview.data || conflicts.length > 0))}>
                Next
              </Button>
            )}
            {step === 3 && (
              <Button type="primary" loading={create.isPending} disabled={!preview.data || conflicts.length > 0}
                onClick={() => create.mutate()}>
                Create {total} apartments
              </Button>
            )}
          </Space>
        </Flex>
        {create.error && isApiError(create.error, "UNIT_NUMBER_TAKEN") && (
          <Alert type="error" showIcon style={{ marginTop: 16 }} title={errorMessage(create.error)} />
        )}
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <BulkUnitsPage />
    </Suspense>
  );
}
