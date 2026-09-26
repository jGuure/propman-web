"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Col, Form, Input, InputNumber, Modal, Row, Switch } from "antd";
import { useEffect } from "react";
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
      message.success(building ? "Flat saved" : `${saved.name} added`);
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
    <Modal open={open} title={building ? `Edit ${building.name}` : "Add flat"} onCancel={onClose}
      onOk={() => form.submit()} okText={building ? "Save" : "Add"} confirmLoading={save.isPending} destroyOnHidden>
      <Form<BuildingRequest> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "e.g. A" }, { max: 20 }]}>
              <Input placeholder="A" autoFocus />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter a name" }, { max: 100 }]}>
              <Input placeholder="Flat A" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="floorsCount" label="Floors above ground" rules={[{ required: true }]}
              extra="Ground floor is floor 0.">
              <InputNumber min={1} max={200} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="basementFloors" label="Basement floors">
              <InputNumber min={0} max={20} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="hasLift" label="Lift" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label="Description" rules={[{ max: 5000 }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
