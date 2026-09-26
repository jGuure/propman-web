"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Form, Modal } from "antd";
import { useEffect } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { ResidentDetails, ResidentRequest } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { ResidentFields } from "./ResidentFields";

/** Add a resident (no `resident`) or edit one. */
export function ResidentFormModal({ open, resident, onClose, onSaved }: {
  open: boolean; resident?: ResidentDetails; onClose: () => void; onSaved?: (r: ResidentDetails) => void;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ResidentRequest>();

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (resident) {
        form.setFieldsValue(resident);
      }
    }
  }, [open, resident, form]);

  const save = useMutation({
    mutationFn: (v: ResidentRequest) => (resident ? api.updateResident(resident.id, v) : api.createResident(v)),
    onSuccess: (r) => {
      message.success(t(resident ? "residents.saved" : "residents.added", { name: r.fullName }));
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["resident", r.id] });
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      onSaved?.(r);
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Modal open={open} title={resident ? t("residents.edit") : t("residents.add")} onCancel={onClose}
      onOk={() => form.submit()} okText={resident ? t("common.save") : t("common.add")}
      confirmLoading={save.isPending} destroyOnHidden width={620}>
      <Form<ResidentRequest> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
        <ResidentFields />
      </Form>
    </Modal>
  );
}
