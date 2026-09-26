"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Col, Form, Input, InputNumber, Modal, Row, Switch } from "antd";
import { useEffect } from "react";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Building, BuildingRequest } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { applyFieldErrors } from "@/lib/forms";
import { invalidatePortfolio } from "./invalidate";

interface Props {
  open: boolean;
  propertyId: string;
  building?: Building;
  onClose: () => void;
}

export function BuildingFormModal({ open, propertyId, building, onClose }: Props) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<BuildingRequest>();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(building ?? { floorsCount: 4, basementFloors: 0, hasLift: false });
    }
  }, [open, building, form]);

  const save = useMutation({
    mutationFn: (values: BuildingRequest) =>
      building ? api.updateBuilding(building.id, values) : api.createBuilding(propertyId, values),
    onSuccess: (saved) => {
      message.success(building ? t("flats.saved") : t("flats.added", { name: saved.name }));
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
    <Modal open={open} title={building ? t("flats.formEdit", { name: building.name }) : t("flats.formAdd")} onCancel={onClose}
      onOk={() => form.submit()} okText={building ? t("common.save") : t("common.add")} confirmLoading={save.isPending} destroyOnHidden>
      <Form<BuildingRequest> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="code" label={t("flats.code")} rules={[{ required: true, message: t("validation.required") }, { max: 20 }]}>
              <Input placeholder="A" autoFocus />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="name" label={t("common.name")} rules={[{ required: true, message: t("validation.enterName") }, { max: 100 }]}>
              <Input placeholder={t("flats.placeholderName")} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="floorsCount" label={t("flats.floorsAbove")} rules={[{ required: true }]}
              extra={t("flats.floorsHelp")}>
              <InputNumber min={1} max={200} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="basementFloors" label={t("flats.basement")}>
              <InputNumber min={0} max={20} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="hasLift" label={t("flats.lift")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label={t("common.description")} rules={[{ max: 5000 }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
