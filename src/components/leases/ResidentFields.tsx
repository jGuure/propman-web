"use client";

import { Col, Form, Input, Row, Select } from "antd";
import type { NamePath } from "antd/es/form/interface";
import { useT } from "@/i18n/provider";
import type { IdType } from "@/lib/api/types";

const ID_TYPES: IdType[] = ["NATIONAL_ID", "PASSPORT", "OTHER"];
const PHONE = /^\+?[0-9 ()-]{6,30}$/;

/** Resident fields, used by the resident form and inline when renting out to a new resident. */
export function ResidentFields({ prefix = [], full = true }: { prefix?: (string | number)[]; full?: boolean }) {
  const { t } = useT();
  const name = (field: string): NamePath => [...prefix, field];
  return (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name={name("fullName")} label={t("residents.name")}
          rules={[{ required: true, whitespace: true, message: t("validation.enterName") }, { max: 150 }]}>
          <Input autoComplete="off" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name={name("phone")} label={t("residents.phone")} extra={full ? t("residents.phoneHelp") : undefined}
          rules={[{ required: true, message: t("validation.required") },
            { pattern: PHONE, message: t("validation.required") }]}>
          <Input inputMode="tel" placeholder="+252 61 …" />
        </Form.Item>
      </Col>
      {full && (
        <>
          <Col xs={24} sm={12}>
            <Form.Item name={name("altPhone")} label={t("residents.altPhone")} rules={[{ pattern: PHONE, message: t("validation.required") }]}>
              <Input inputMode="tel" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name={name("email")} label={t("residents.email")} rules={[{ type: "email", message: t("validation.validEmail") }]}>
              <Input />
            </Form.Item>
          </Col>
        </>
      )}
      <Col xs={12}>
        <Form.Item name={name("idType")} label={t("residents.idType")}>
          <Select allowClear options={ID_TYPES.map((v) => ({ value: v, label: t(`idType.${v}`) }))} />
        </Form.Item>
      </Col>
      <Col xs={12}>
        <Form.Item name={name("idNumber")} label={t("residents.idNumber")} rules={[{ max: 50 }]}>
          <Input />
        </Form.Item>
      </Col>
      {full && (
        <Col xs={24}>
          <Form.Item name={name("notes")} label={t("residents.notes")} rules={[{ max: 5000 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      )}
    </Row>
  );
}
