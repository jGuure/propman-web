"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Descriptions, Flex, Form, Input, InputNumber, Result, Row, Select, Skeleton, Space, Steps, Switch, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT, type TKey } from "@/i18n/provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { BulkCreateResult, BulkPreview, BulkUnitsRequest, UnitType } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { CURRENCY, formatMoney } from "@/lib/format";
import { useLabels } from "@/lib/labels";
import { useAmenities, useEnums, usePortfolioPermissions } from "@/lib/portfolio-hooks";

type WizardForm = Omit<BulkUnitsRequest, "defaults"> & BulkUnitsRequest["defaults"];

const STEP_FIELDS: (keyof WizardForm)[][] = [
  ["buildingId", "floorFrom", "floorTo", "unitsPerFloor"],
  ["numberPattern", "startIndex"],
  ["type", "bedrooms", "bathrooms", "sizeSqm", "furnished", "baseRent", "depositAmount", "amenityIds"],
  [],
];

const TOKENS: { token: string; help: TKey }[] = [
  { token: "{floor}", help: "bulk.tokenFloor" },
  { token: "{index:02}", help: "bulk.tokenIndex2" },
  { token: "{index}", help: "bulk.tokenIndex" },
  { token: "{letter}", help: "bulk.tokenLetter" },
  { token: "{building}", help: "bulk.tokenBuilding" },
];

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
      furnished: v.furnished, baseRent: v.baseRent ?? 0, currency: CURRENCY, depositAmount: v.depositAmount,
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
  const { canManage } = usePortfolioPermissions();
  const { t, tn } = useT();
  const labels = useLabels();
  const { data: enums } = useEnums();
  const { data: amenities } = useAmenities("UNIT");
  const [form] = Form.useForm<WizardForm>();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<BulkCreateResult>();
  const property = useQuery({ queryKey: ["property", id], queryFn: () => api.property(id) });
  const values = Form.useWatch([], form) as WizardForm | undefined;
  const buildings = (property.data?.buildings ?? []).filter((b) => b.status === "ACTIVE");
  const building = buildings.find((b) => b.id === values?.buildingId);

  useEffect(() => {
    if (property.data) {
      const active = property.data.buildings.filter((b) => b.status === "ACTIVE");
      const first = active.find((b) => b.id === preselectedFlat) ?? active[0];
      form.setFieldsValue({
        buildingId: first?.id, floorFrom: first ? 1 : 0, floorTo: first ? first.floorsCount : 0, unitsPerFloor: 4,
        numberPattern: first ? "{floor}{index:02}" : "{index}", startIndex: 1, type: "TWO_BEDROOM", bedrooms: 2,
        bathrooms: 1, furnished: false, amenityIds: [],
      });
    }
  }, [property.data, form, preselectedFlat]);

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

  /** Pattern problems come back as a field error on numberPattern; show them as a sentence. */
  const previewError = (error: unknown): string => {
    if (isApiError(error) && error.fieldErrors.length > 0 && error.fieldErrors[0].field === "numberPattern") {
      return t("bulk.patternError", { message: error.fieldErrors[0].message });
    }
    return errorMessage(error);
  };

  if (property.isPending) {
    return <Card><Skeleton active /></Card>;
  }
  if (property.error) {
    return <Alert type="error" showIcon title={errorMessage(property.error)} />;
  }
  if (!canManage || property.data.status === "ARCHIVED") {
    return <Result status="403" title={t("bulk.notAllowed")} extra={<Link href={`/properties/${id}`}><Button>{t("common.back")}</Button></Link>} />;
  }
  if (result) {
    return (
      <Card>
        <Result status="success" title={t("bulk.created", { count: result.created })}
          subTitle={t("bulk.createdText", { name: building ? building.name : property.data.name })}
          extra={[
            <Link key="view" href={`/properties/${id}${result.buildingId ? `?flat=${result.buildingId}` : ""}`}><Button type="primary">{t("bulk.seeInBuilding")}</Button></Link>,
            <Button key="more" onClick={() => { setResult(undefined); setStep(0); }}>{t("bulk.addMore")}</Button>,
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
    <Card size="small" title={preview.data ? t("bulk.previewCount", { count: preview.data.count }) : t("bulk.preview")} style={{ marginTop: 8 }}>
      {preview.isFetching && !preview.data && <Skeleton active paragraph={{ rows: 3 }} />}
      {preview.error && <Alert type="error" showIcon title={previewError(preview.error)} />}
      {conflicts.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          title={tn("bulk.conflicts", conflicts.length)}
          description={t("bulk.conflictsHelp")} />
      )}
      {preview.data && (
        <Flex vertical gap={6} style={{ maxHeight: 320, overflow: "auto" }}>
          {[...floorsByNumber.entries()].sort((a, b) => b[0] - a[0]).map(([floor, units]) => (
            <Flex key={floor} gap={8} align="center">
              <Typography.Text type="secondary" style={{ width: 84, fontSize: 13 }}>{labels.floor(floor)}</Typography.Text>
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
      <Typography.Title level={3} style={{ marginTop: 4 }}>{t("bulk.title")}</Typography.Title>
      <Card>
        <Steps current={step} style={{ marginBottom: 24 }} items={[
          { title: t("bulk.stepFloors") }, { title: t("bulk.stepNumbering") }, { title: t("bulk.stepDetails") }, { title: t("bulk.stepReview") },
        ]} />
        <Form<WizardForm> form={form} layout="vertical" requiredMark={false} preserve>
          <div style={{ display: step === 0 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="buildingId" label={t("bulk.flat")}
                  extra={buildings.length === 0 ? t("bulk.noFlatsHelp") : undefined}>
                  <Select allowClear placeholder={t("bulk.noFlat")} options={buildings.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                    onChange={(v) => {
                      const b = buildings.find((x) => x.id === v);
                      form.setFieldsValue(b ? { floorFrom: 1, floorTo: b.floorsCount } : { floorFrom: 0, floorTo: 0 });
                    }} />
                </Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="floorFrom" label={t("bulk.fromFloor")} rules={[{ required: true }]}>
                  <InputNumber min={minFloor} max={maxFloor} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="floorTo" label={t("bulk.toFloor")} dependencies={["floorFrom"]} rules={[{ required: true },
                  ({ getFieldValue }) => ({ validator: (_, v) => (v >= getFieldValue("floorFrom") ? Promise.resolve()
                    : Promise.reject(new Error(t("validation.mustBeAtLeastFrom")))) })]}>
                  <InputNumber min={minFloor} max={maxFloor} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="unitsPerFloor" label={t("bulk.perFloor")} rules={[{ required: true }]}>
                  <InputNumber min={1} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Typography.Text type={total > (enums?.maxBulkUnits ?? 500) ? "danger" : "secondary"}>
              {t("bulk.willCreate", { count: total })}{total > (enums?.maxBulkUnits ?? 500) ? t("bulk.maxIs", { max: enums?.maxBulkUnits ?? 500 }) : ""}.
              {building && t("bulk.flatRange", { name: building.name, from: labels.floor(minFloor).toLowerCase(), to: labels.floor(maxFloor).toLowerCase() })}
            </Typography.Text>
          </div>
          <div style={{ display: step === 1 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="numberPattern" label={t("bulk.pattern")} rules={[{ required: true, whitespace: true }, { max: 60 }]}
                  extra={t("bulk.patternHelp")}>
                  <Input />
                </Form.Item>
                <Flex wrap gap={6} style={{ marginBottom: 16 }}>
                  {TOKENS.filter((tk) => tk.token !== "{building}" || building).map((tk) => (
                    <Button key={tk.token} size="small" onClick={() => form.setFieldValue("numberPattern", `${values?.numberPattern ?? ""}${tk.token}`)}>
                      {tk.token} <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t(tk.help)}</Typography.Text>
                    </Button>
                  ))}
                </Flex>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="startIndex" label={t("bulk.firstNumber")}>
                  <InputNumber min={0} max={999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            {step === 1 && previewPanel}
          </div>
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="type" label={t("common.type")} rules={[{ required: true }]}>
                  <Select onChange={(type: UnitType) => form.setFieldValue("bedrooms", enums?.unitTypes.find((x) => x.value === type)?.defaultBedrooms)}
                    options={(enums?.unitTypes ?? []).map((type) => ({ value: type.value, label: labels.unitType(type.value) }))} />
                </Form.Item>
              </Col>
              <Col xs={8} md={5}><Form.Item name="bedrooms" label={t("apartments.bedrooms")}><InputNumber min={0} max={50} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={8} md={5}><Form.Item name="bathrooms" label={t("apartments.bathrooms")}><InputNumber min={0} max={50} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={8} md={6}><Form.Item name="sizeSqm" label={t("common.sizeSqm")}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={12} md={8}>
                <Form.Item name="baseRent" label={t("common.monthlyRent")} rules={[{ required: true, message: t("validation.enterRent") }]}
                  extra={t("common.currencyNote")}>
                  <InputNumber min={0} style={{ width: "100%" }} prefix="$" />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="depositAmount" label={t("common.deposit")}>
                  <InputNumber min={0} style={{ width: "100%" }} prefix="$" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="amenityIds" label={t("apartments.amenities")}>
                  <Select mode="multiple" optionFilterProp="label" options={(amenities ?? []).map((a) => ({ value: a.id, label: a.name }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="furnished" label={t("apartments.furnished")} valuePropName="checked"><Switch /></Form.Item>
              </Col>
            </Row>
          </div>
          {step === 3 && values && (
            <>
              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label={t("bulk.flat")}>{building?.name ?? t("bulk.noFlat")}</Descriptions.Item>
                <Descriptions.Item label={t("bulk.stepFloors")}>{labels.floor(values.floorFrom)} – {labels.floor(values.floorTo)}</Descriptions.Item>
                <Descriptions.Item label={t("apartments.title")}>{t("bulk.perFloorSummary", { count: total, perFloor: values.unitsPerFloor })}</Descriptions.Item>
                <Descriptions.Item label={t("bulk.numbers")}>{preview.data ? `${preview.data.units[0]?.unitNumber} … ${preview.data.units.at(-1)?.unitNumber}` : values.numberPattern}</Descriptions.Item>
                <Descriptions.Item label={t("common.type")}>{t("bulk.typeSummary", { type: labels.unitType(values.type), beds: values.bedrooms ?? 0, baths: values.bathrooms ?? 0 })}</Descriptions.Item>
                <Descriptions.Item label={t("common.rent")}>{t("bulk.rentSummary", { rent: formatMoney(values.baseRent) })}</Descriptions.Item>
              </Descriptions>
              {previewPanel}
            </>
          )}
        </Form>
        <Flex justify="space-between" style={{ marginTop: 24 }}>
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>{t("common.back")}</Button>
          <Space>
            {step < 3 && (
              <Button type="primary" onClick={next}
                disabled={(step === 0 && (total === 0 || total > (enums?.maxBulkUnits ?? 500))) || (step === 1 && (!preview.data || conflicts.length > 0))}>
                {t("common.next")}
              </Button>
            )}
            {step === 3 && (
              <Button type="primary" loading={create.isPending} disabled={!preview.data || conflicts.length > 0}
                onClick={() => create.mutate()}>
                {t("bulk.createButton", { count: total })}
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
