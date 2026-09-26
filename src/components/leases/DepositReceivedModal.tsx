"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Modal } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Lease } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { DATE_FORMAT, isoDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export function DepositReceivedModal({ open, lease, onClose }: { open: boolean; lease: Lease; onClose: () => void }) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ receivedOn: Dayjs }>();
  const save = useMutation({
    mutationFn: (v: { receivedOn: Dayjs }) => api.depositReceived(lease.id, isoDate(v.receivedOn)!),
    onSuccess: () => {
      message.success(t("leases.depositMarked"));
      invalidatePortfolio(queryClient);
      onClose();
    },
    onError: (error) => message.error(errorMessage(error)),
  });
  return (
    <Modal open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden
      title={t("leases.depositReceivedTitle", { amount: formatMoney(lease.deposit.amount) })} okText={t("common.save")}>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ receivedOn: dayjs() }}
        onFinish={(v) => save.mutate(v)}>
        <Form.Item name="receivedOn" label={t("leases.depositReceivedOn")} rules={[{ required: true }]}>
          <DatePicker format={DATE_FORMAT} allowClear={false} style={{ width: "100%" }}
            disabledDate={(d) => d.isAfter(dayjs(), "day")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
