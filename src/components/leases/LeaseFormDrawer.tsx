"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Checkbox, Col, DatePicker, Divider, Drawer, Flex, Form, Input, InputNumber, Row, Segmented, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Lease, Occupant, ResidentRequest } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { DATE_FORMAT, fromIsoDate, isoDate } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/forms";
import { ResidentFields } from "./ResidentFields";
import { ResidentSelect } from "./ResidentSelect";

/** Where a new lease goes: an apartment, or one room of a room-by-room apartment. */
export interface RentTarget {
  unitId: string;
  unitNumber: string;
  room?: { id: string; name: string } | null;
  suggestedRent?: number | null;
  suggestedDeposit?: number | null;
  /** Earliest free day, e.g. the day after the current lease's planned end. */
  earliestStart?: string | null;
}

interface LeaseForm {
  residentMode: "existing" | "new";
  residentId?: string;
  newResident?: ResidentRequest;
  startDate: Dayjs;
  endDate?: Dayjs | null;
  monthlyRent: number;
  depositAmount?: number | null;
  depositReceived?: boolean;
  depositReceivedOn?: Dayjs | null;
  occupants?: Occupant[];
  notes?: string | null;
}

/** Rent out an apartment or room (`target`), or edit a lease (`lease`). */
export function LeaseFormDrawer({ open, target, lease, onClose, onSaved }: {
  open: boolean; target?: RentTarget; lease?: Lease; onClose: () => void; onSaved?: (lease: Lease) => void;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<LeaseForm>();
  const residentMode = Form.useWatch("residentMode", form);
  const depositReceived = Form.useWatch("depositReceived", form);
  const depositAmount = Form.useWatch("depositAmount", form);
  const startDate = Form.useWatch("startDate", form);
  const editing = !!lease;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.resetFields();
    if (lease) {
      form.setFieldsValue({
        startDate: dayjs(lease.startDate),
        endDate: fromIsoDate(lease.endDate),
        monthlyRent: lease.monthlyRent,
        depositAmount: lease.deposit.amount || null,
        occupants: lease.occupants,
        notes: lease.notes,
      });
    } else if (target) {
      const earliest = target.earliestStart ? dayjs(target.earliestStart) : null;
      form.setFieldsValue({
        residentMode: "new",
        startDate: earliest && earliest.isAfter(dayjs(), "day") ? earliest : dayjs(),
        monthlyRent: target.suggestedRent ?? undefined,
        depositAmount: target.suggestedDeposit ?? null,
        depositReceived: false,
        occupants: [],
      });
    }
  }, [open, lease, target, form]);

  const save = useMutation({
    mutationFn: (v: LeaseForm) => {
      const occupants = (v.occupants ?? []).filter((o) => o?.fullName?.trim());
      if (lease) {
        return api.updateLease(lease.id, {
          startDate: isoDate(v.startDate)!, endDate: isoDate(v.endDate), monthlyRent: v.monthlyRent,
          depositAmount: v.depositAmount ?? 0, occupants, notes: v.notes,
        });
      }
      return api.createLease({
        unitId: target!.unitId,
        roomId: target!.room?.id ?? null,
        residentId: v.residentMode === "existing" ? v.residentId : null,
        newResident: v.residentMode === "new" ? v.newResident : null,
        startDate: isoDate(v.startDate)!,
        endDate: isoDate(v.endDate),
        monthlyRent: v.monthlyRent,
        depositAmount: v.depositAmount ?? 0,
        depositReceivedOn: v.depositReceived && v.depositAmount ? isoDate(v.depositReceivedOn ?? dayjs()) : null,
        occupants,
        notes: v.notes,
      });
    },
    onSuccess: (saved) => {
      message.success(editing ? t("leases.saved") : t("leases.created", { name: saved.resident.fullName }));
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

  const title = editing ? t("leases.edit")
    : target?.room ? t("leases.rentOutRoom", { room: target.room.name })
      : t("leases.rentOutApartment", { number: target?.unitNumber ?? "" });

  return (
    <Drawer open={open} onClose={onClose} size={620} destroyOnHidden
      title={<>{title}{editing && <Typography.Text type="secondary" style={{ fontWeight: 400 }}> · {lease.resident.fullName}</Typography.Text>}</>}
      extra={
        <Space>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>
            {editing ? t("common.save") : t("leases.rentOut")}
          </Button>
        </Space>
      }>
      <Form<LeaseForm> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
        onFinish={(v) => save.mutate(v)}>
        {!editing && (
          <>
            <Form.Item name="residentMode" style={{ marginBottom: 12 }}>
              <Segmented block options={[
                { value: "new", label: t("leases.newResident") },
                { value: "existing", label: t("leases.existingResident") },
              ]} />
            </Form.Item>
            {residentMode === "existing" ? (
              <Form.Item name="residentId" label={t("leases.resident")}
                rules={[{ required: true, message: t("leases.chooseResident") }]}>
                <ResidentSelect />
              </Form.Item>
            ) : (
              <ResidentFields prefix={["newResident"]} full={false} />
            )}
            <Divider style={{ margin: "4px 0 16px" }} />
          </>
        )}
        <Row gutter={16}>
          <Col xs={12}>
            <Form.Item name="startDate" label={t("leases.startDate")} rules={[{ required: true, message: t("validation.required") }]}>
              <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} allowClear={false}
                disabledDate={editing && lease.status === "ACTIVE" ? (d) => d.isAfter(dayjs(), "day") : undefined} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="endDate" label={t("leases.endDate")} extra={t("leases.endDateHelp")}>
              <DatePicker format={DATE_FORMAT} style={{ width: "100%" }}
                disabledDate={(d) => !!startDate && d.isBefore(startDate, "day")} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="monthlyRent" label={t("leases.monthlyRent")} extra={t("common.currencyNote")}
              rules={[{ required: true, message: t("validation.enterRent") }]}>
              <InputNumber min={0} prefix="$" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="depositAmount" label={t("leases.deposit")}>
              <InputNumber min={0} prefix="$" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          {!editing && !!depositAmount && (
            <Col xs={24}>
              <Flex gap={16} align="center" wrap style={{ marginBottom: 16 }}>
                <Form.Item name="depositReceived" valuePropName="checked" noStyle>
                  <Checkbox>{t("leases.depositReceived")}</Checkbox>
                </Form.Item>
                {depositReceived && (
                  <Form.Item name="depositReceivedOn" noStyle initialValue={dayjs()}>
                    <DatePicker format={DATE_FORMAT} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
                  </Form.Item>
                )}
              </Flex>
            </Col>
          )}
        </Row>

        <Typography.Text strong style={{ display: "block" }}>{t("leases.occupants")}</Typography.Text>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
          {t("leases.occupantsHelp")}
        </Typography.Text>
        <Form.List name="occupants">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Flex key={field.key} gap={8} align="start" wrap={false}>
                  <Form.Item name={[field.name, "fullName"]} style={{ flex: 2, marginBottom: 8 }}
                    rules={[{ required: true, whitespace: true, message: t("validation.enterName") }]}>
                    <Input placeholder={t("leases.occupantName")} />
                  </Form.Item>
                  <Form.Item name={[field.name, "phone"]} style={{ flex: 1.4, marginBottom: 8 }}>
                    <Input placeholder={t("leases.occupantPhone")} inputMode="tel" />
                  </Form.Item>
                  <Form.Item name={[field.name, "relationship"]} style={{ flex: 1.4, marginBottom: 8 }}>
                    <Input placeholder={t("leases.relationshipPlaceholder")} />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={t("common.remove")} onClick={() => remove(field.name)} />
                </Flex>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ fullName: "" })} style={{ marginBottom: 16 }}>
                {t("leases.addOccupant")}
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="notes" label={t("leases.notes")} rules={[{ max: 5000 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
