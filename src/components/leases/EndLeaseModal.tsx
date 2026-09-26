"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, DatePicker, Form, Input, InputNumber, Modal, Radio, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { DepositStatus, Lease } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { DATE_FORMAT, isoDate } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/forms";
import { formatMoney } from "@/lib/format";

interface EndForm {
  movedOutOn?: Dayjs;
  reason?: string;
  outcome?: DepositStatus;
  returnedAmount?: number;
  note?: string;
}

/** Records the move-out of an active lease ({@code mode} "end") or cancels an upcoming one ("cancel"). */
export function EndLeaseModal({ open, lease, mode, onClose }: {
  open: boolean; lease: Lease; mode: "end" | "cancel"; onClose: () => void;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<EndForm>();
  const outcome = Form.useWatch("outcome", form);
  const held = lease.deposit.status === "HELD";

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ movedOutOn: dayjs(), outcome: held ? "RETURNED" : undefined });
    }
  }, [open, held, form]);

  const submit = useMutation({
    mutationFn: (v: EndForm) => {
      const deposit = held ? { outcome: v.outcome, returnedAmount: v.returnedAmount, note: v.note } : null;
      return mode === "end"
        ? api.endLease(lease.id, { movedOutOn: isoDate(v.movedOutOn)!, reason: v.reason, deposit })
        : api.cancelLease(lease.id, { reason: v.reason, deposit });
    },
    onSuccess: (l) => {
      message.success(mode === "end" ? t("leases.ended", { name: l.resident.fullName }) : t("leases.cancelled"));
      invalidatePortfolio(queryClient);
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Modal open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={submit.isPending} destroyOnHidden
      title={mode === "end" ? t("leases.moveOutTitle", { name: lease.resident.fullName })
        : t("leases.cancelTitle", { name: lease.resident.fullName })}
      okText={mode === "end" ? t("leases.recordMoveOut") : t("leases.cancel")}
      okButtonProps={{ danger: mode === "cancel" }} cancelText={t("common.close")}>
      {mode === "cancel" && <Alert type="warning" showIcon title={t("leases.cancelText")} style={{ marginBottom: 16 }} />}
      <Form<EndForm> form={form} layout="vertical" requiredMark={false} onFinish={(v) => submit.mutate(v)}>
        {mode === "end" && (
          <Form.Item name="movedOutOn" label={t("leases.movedOutOn")} rules={[{ required: true, message: t("validation.required") }]}>
            <DatePicker format={DATE_FORMAT} allowClear={false} style={{ width: "100%" }}
              disabledDate={(d) => d.isAfter(dayjs(), "day") || d.isBefore(dayjs(lease.startDate), "day")} />
          </Form.Item>
        )}
        <Form.Item name="reason" label={t("leases.reason")} rules={[{ max: 255 }]}>
          <Input />
        </Form.Item>
        {held && (
          <>
            <Form.Item name="outcome" label={t("leases.depositOutcome", { amount: formatMoney(lease.deposit.amount) })}
              rules={[{ required: true, message: t("validation.required") }]}>
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="RETURNED">{t("leases.returned")}</Radio>
                  <Radio value="PARTLY_RETURNED">{t("leases.partlyReturned")}</Radio>
                  <Radio value="KEPT">{t("leases.kept")}</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {outcome === "PARTLY_RETURNED" && (
              <Form.Item name="returnedAmount" label={t("leases.returnedAmount")}
                rules={[{ required: true, message: t("validation.required") }]}>
                <InputNumber min={0.01} max={lease.deposit.amount - 0.01} prefix="$" style={{ width: "100%" }} />
              </Form.Item>
            )}
            {outcome && outcome !== "RETURNED" && (
              <Form.Item name="note" label={t("leases.depositNote")} rules={[{ max: 255 }]}>
                <Input />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
