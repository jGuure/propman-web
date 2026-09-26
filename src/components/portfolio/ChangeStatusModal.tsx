"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Form, Input, Modal, Radio, Space } from "antd";
import { useEffect } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { UnitStatus } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { UNIT_STATUS_LABELS } from "@/lib/labels";
import { useAllowedTransitions, useEnums } from "@/lib/portfolio-hooks";
import { invalidatePortfolio } from "./invalidate";
import { UnitStatusTag } from "./tags";

interface Props {
  open: boolean;
  unitId: string;
  unitNumber: string;
  status: UnitStatus;
  onClose: () => void;
}

/** Offers only the transitions the API allows for the user's role; asks for a reason where required. */
export function ChangeStatusModal({ open, unitId, unitNumber, status, onClose }: Props) {
  const { api } = useTenant();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: enums } = useEnums();
  const allowed = useAllowedTransitions(status);
  const [form] = Form.useForm<{ status: UnitStatus; reason?: string }>();
  const target = Form.useWatch("status", form);
  const reasonRequired = !!target && (enums?.reasonRequiredFor ?? []).includes(target);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const change = useMutation({
    mutationFn: (values: { status: UnitStatus; reason?: string }) =>
      api.changeUnitStatus(unitId, values.status, values.reason),
    onSuccess: (unit) => {
      message.success(`Unit ${unit.unitNumber} is now ${UNIT_STATUS_LABELS[unit.status].toLowerCase()}`);
      invalidatePortfolio(queryClient);
      onClose();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <Modal open={open} title={<>Change status of unit {unitNumber}</>} onCancel={onClose} onOk={() => form.submit()}
      okText="Change status" okButtonProps={{ disabled: allowed.length === 0 }} confirmLoading={change.isPending}
      destroyOnHidden>
      <p>Current status: <UnitStatusTag status={status} /></p>
      {allowed.length === 0 ? (
        <Alert type="info" showIcon title="Your role cannot change this unit's status." />
      ) : (
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => change.mutate(v)}>
          <Form.Item name="status" label="New status" rules={[{ required: true, message: "Choose a status" }]}>
            <Radio.Group>
              <Space orientation="vertical">
                {allowed.map((s) => <Radio key={s} value={s}><UnitStatusTag status={s} /></Radio>)}
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="reason" label={reasonRequired ? "Reason" : "Reason (optional)"}
            rules={[{ required: reasonRequired, whitespace: true, message: "A reason is required" }, { max: 255 }]}>
            <Input.TextArea rows={2} placeholder={target === "MAINTENANCE" ? "e.g. Water leak in the bathroom" : undefined} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
