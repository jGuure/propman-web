"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, DatePicker, Flex, Form, Input, InputNumber, Modal, Radio } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Charge, PaymentMethod } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { DATE_FORMAT, isoDate } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/forms";
import { formatMoney } from "@/lib/format";

export const PAYMENT_METHODS: PaymentMethod[] = ["EVC_PLUS", "ZAAD", "EDAHAB", "CASH", "BANK", "OTHER"];

interface PaymentForm {
  amount?: number;
  method: PaymentMethod;
  paidOn: Dayjs;
  reference?: string;
  note?: string;
}

export interface PayTarget {
  leaseId: string;
  residentName: string;
  monthlyRent: number;
  owed?: number;
}

/**
 * Records money received. With a `charge`: "Paid" in one tap (what is left on that bill). Otherwise any amount
 * for the lease, with quick buttons for 1–6 months or what is owed.
 */
export function PaymentModal({ open, target, charge, onClose }: {
  open: boolean; target: PayTarget; charge?: Charge; onClose: () => void;
}) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PaymentForm>();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        method: "EVC_PLUS", paidOn: dayjs(),
        amount: charge ? undefined : (target.owed && target.owed > 0 ? target.owed : target.monthlyRent),
      });
    }
  }, [open, charge, target, form]);

  const save = useMutation({
    mutationFn: (v: PaymentForm) => {
      const common = { method: v.method, paidOn: isoDate(v.paidOn), reference: v.reference, note: v.note };
      return charge ? api.payCharge(charge.id, common) : api.recordPayment({ leaseId: target.leaseId, amount: v.amount!, ...common });
    },
    onSuccess: (_, v) => {
      message.success(t("payments.recorded", { amount: formatMoney(charge ? charge.remaining : v.amount) }));
      invalidatePortfolio(queryClient);
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  const title = charge
    ? t("payments.quickPayTitle", { name: target.residentName, amount: formatMoney(charge.remaining) })
    : t("payments.recordFor", { name: target.residentName });

  return (
    <Modal open={open} title={title} onCancel={onClose} onOk={() => form.submit()} okText={t("common.save")}
      confirmLoading={save.isPending} destroyOnHidden width={520}>
      <Form<PaymentForm> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
        {!charge && (
          <>
            <Form.Item name="amount" label={t("payments.amount")} rules={[{ required: true, message: t("validation.required") }]}
              style={{ marginBottom: 8 }}>
              <InputNumber min={0.01} prefix="$" style={{ width: "100%" }} size="large" />
            </Form.Item>
            <Flex wrap gap={6} style={{ marginBottom: 16 }}>
              {!!target.owed && target.owed > 0 && (
                <Button size="small" onClick={() => form.setFieldValue("amount", target.owed)}>
                  {t("payments.owedButton", { amount: formatMoney(target.owed) })}
                </Button>
              )}
              {target.monthlyRent > 0 && [1, 2, 3, 6].map((n) => (
                <Button key={n} size="small" onClick={() => form.setFieldValue("amount", target.monthlyRent * n)}>
                  {tn("payments.months", n)}
                </Button>
              ))}
            </Flex>
          </>
        )}
        <Form.Item name="method" label={t("payments.method")} rules={[{ required: true }]}>
          <Radio.Group optionType="button" buttonStyle="solid"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`paymentMethod.${m}`) }))} />
        </Form.Item>
        <Flex gap={12}>
          <Form.Item name="paidOn" label={t("payments.paidOn")} rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker format={DATE_FORMAT} allowClear={false} style={{ width: "100%" }}
              disabledDate={(d) => d.isAfter(dayjs(), "day")} />
          </Form.Item>
          <Form.Item name="reference" label={t("payments.reference")} rules={[{ max: 100 }]} style={{ flex: 1.4 }}>
            <Input placeholder={t("payments.referencePlaceholder")} />
          </Form.Item>
        </Flex>
        <Form.Item name="note" label={t("payments.note")} rules={[{ max: 255 }]}>
          <Input />
        </Form.Item>
        {!charge && <Alert type="info" showIcon title={t("payments.allocationHelp")} />}
      </Form>
    </Modal>
  );
}
