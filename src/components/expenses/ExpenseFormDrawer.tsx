"use client";

import { CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Col, DatePicker, Drawer, Flex, Form, Input, InputNumber, Radio, Row, Select, Space, Typography, Upload } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { PAYMENT_METHODS } from "@/components/payments/PaymentModal";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { compressImage } from "@/lib/compressImage";
import { DATE_FORMAT, isoDate } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/forms";
import { formatMoney } from "@/lib/format";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["REPAIR", "PAINTING", "CLEANING", "ELECTRICITY", "WATER",
  "GENERATOR", "SECURITY", "SALARIES", "OTHER"];

interface ExpenseForm {
  propertyId: string;
  buildingId?: string;
  unitId?: string;
  spentOn: Dayjs;
  amount: number;
  category: ExpenseCategory;
  description: string;
  paidTo?: string;
  method: PaymentMethod;
}

/** Add an expense (optionally for a given property) or edit one; a receipt photo can be attached. Mount it per use. */
export function ExpenseFormDrawer({ open, expense, propertyId, onClose }: {
  open: boolean; expense?: Expense; propertyId?: string; onClose: () => void;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ExpenseForm>();
  const [receipt, setReceipt] = useState<File>();
  const selectedProperty = Form.useWatch("propertyId", form);
  const selectedFlat = Form.useWatch("buildingId", form);

  const properties = useQuery({
    queryKey: ["properties", "options"], queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }), enabled: open,
  });
  const flats = useQuery({
    queryKey: ["buildings", selectedProperty], queryFn: () => api.buildings(selectedProperty), enabled: open && !!selectedProperty,
  });
  const apartments = useQuery({
    queryKey: ["units", "options", selectedProperty, selectedFlat],
    queryFn: () => api.units({ propertyId: selectedProperty, buildingId: selectedFlat, page: 0, size: 200, sort: "unitNumber,asc" }),
    enabled: open && !!selectedProperty,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.resetFields();
    form.setFieldsValue(expense ? {
      propertyId: expense.property.id, buildingId: expense.building?.id, unitId: expense.unit?.id,
      spentOn: dayjs(expense.spentOn), amount: expense.amount, category: expense.category,
      description: expense.description, paidTo: expense.paidTo ?? undefined, method: expense.method,
    } : { propertyId, spentOn: dayjs(), category: "REPAIR", method: "CASH" });
  }, [open, expense, propertyId, form]);

  const save = useMutation({
    mutationFn: async (v: ExpenseForm) => {
      const body = {
        propertyId: v.propertyId, buildingId: v.buildingId ?? null, unitId: v.unitId ?? null, spentOn: isoDate(v.spentOn)!,
        amount: v.amount, category: v.category, description: v.description, paidTo: v.paidTo ?? null, method: v.method,
      };
      const saved = expense ? await api.updateExpense(expense.id, body) : await api.createExpense(body);
      if (receipt) {
        return api.uploadExpenseReceipt(saved.id, await compressImage(receipt));
      }
      return saved;
    },
    onSuccess: (saved) => {
      message.success(expense ? t("expenses.saved") : t("expenses.added", { amount: formatMoney(saved.amount) }));
      invalidatePortfolio(queryClient);
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });
  const removeReceipt = useMutation({
    mutationFn: () => api.deleteExpenseReceipt(expense!.id),
    onSuccess: () => invalidatePortfolio(queryClient),
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <Drawer open={open} onClose={onClose} size={560} destroyOnHidden title={expense ? t("expenses.edit") : t("expenses.add")}
      extra={
        <Space>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>{t("common.save")}</Button>
        </Space>
      }>
      <Form<ExpenseForm> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
        onFinish={(v) => save.mutate(v)}
        onValuesChange={(changed: Partial<ExpenseForm>) => {
          if ("propertyId" in changed) {
            form.setFieldsValue({ buildingId: undefined, unitId: undefined });
          } else if ("buildingId" in changed) {
            form.setFieldValue("unitId", undefined);
          }
        }}>
        <Form.Item name="description" label={t("expenses.description")}
          rules={[{ required: true, whitespace: true, message: t("validation.required") }, { max: 255 }]}>
          <Input placeholder={t("expenses.descriptionPlaceholder")} autoFocus />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12}>
            <Form.Item name="amount" label={t("expenses.amount")} rules={[{ required: true, message: t("validation.required") }]}>
              <InputNumber min={0.01} prefix="$" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="spentOn" label={t("expenses.date")} rules={[{ required: true }]}>
              <DatePicker format={DATE_FORMAT} allowClear={false} style={{ width: "100%" }}
                disabledDate={(d) => d.isAfter(dayjs(), "day")} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="category" label={t("expenses.category")} rules={[{ required: true }]}>
          <Select options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`expenseCategory.${c}`) }))} />
        </Form.Item>
        <Form.Item name="propertyId" label={t("expenses.property")} rules={[{ required: true, message: t("validation.chooseProperty") }]}>
          <Select showSearch={{ optionFilterProp: "label" }} loading={properties.isFetching}
            options={(properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12}>
            <Form.Item name="buildingId" label={t("expenses.flat")}>
              <Select allowClear placeholder={t("expenses.wholeProperty")} disabled={!selectedProperty}
                options={(flats.data ?? []).filter((b) => b.status === "ACTIVE").map((b) => ({ value: b.id, label: b.name }))} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="unitId" label={t("expenses.apartment")}>
              <Select allowClear showSearch={{ optionFilterProp: "label" }} disabled={!selectedProperty}
                options={(apartments.data?.content ?? []).map((u) => ({ value: u.id, label: u.unitNumber }))} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="method" label={t("expenses.method")} rules={[{ required: true }]}>
          <Radio.Group optionType="button" buttonStyle="solid"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`paymentMethod.${m}`) }))} />
        </Form.Item>
        <Form.Item name="paidTo" label={t("expenses.paidTo")} rules={[{ max: 150 }]}>
          <Input placeholder={t("expenses.paidToPlaceholder")} />
        </Form.Item>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>{t("expenses.receipt")}</Typography.Text>
        <Flex gap={8} align="center" wrap>
          <Upload accept="image/png,image/jpeg,image/webp" showUploadList={false}
            beforeUpload={(file) => { setReceipt(file); return false; }}>
            <Button icon={<CameraOutlined />}>{receipt ? receipt.name : t("expenses.addReceipt")}</Button>
          </Upload>
          {expense?.receiptUrl && !receipt && (
            <>
              <a href={expense.receiptUrl} target="_blank" rel="noreferrer">{t("expenses.viewReceipt")}</a>
              <Button type="text" danger size="small" icon={<DeleteOutlined />} loading={removeReceipt.isPending}
                onClick={() => removeReceipt.mutate()}>{t("expenses.removeReceipt")}</Button>
            </>
          )}
        </Flex>
      </Form>
    </Drawer>
  );
}
