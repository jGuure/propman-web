"use client";

import { EditOutlined } from "@ant-design/icons";
import { Button, Empty, Flex, Select, Space, Tag } from "antd";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import type { Amenity, AmenityScope } from "@/lib/api/types";
import { useAmenities } from "@/lib/portfolio-hooks";

interface AmenityEditorProps {
  scope: Extract<AmenityScope, "UNIT" | "PROPERTY">;
  value: Amenity[];
  canEdit: boolean;
  saving?: boolean;
  onSave: (amenityIds: string[]) => void;
}

/** Amenity tags with an inline multi-select editor. */
export function AmenityEditor({ scope, value, canEdit, saving, onSave }: AmenityEditorProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { data: options } = useAmenities(scope);

  if (editing) {
    return (
      <Space.Compact style={{ width: "100%" }}>
        <Select mode="multiple" style={{ width: "100%" }} value={selected} onChange={setSelected} autoFocus
          placeholder={t("amenities.choose")} optionFilterProp="label"
          options={(options ?? []).map((a) => ({ value: a.id, label: a.name }))} />
        <Button type="primary" loading={saving} onClick={() => { onSave(selected); setEditing(false); }}>{t("common.save")}</Button>
        <Button onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
      </Space.Compact>
    );
  }
  return (
    <Flex wrap gap={8} align="center">
      {value.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("amenities.none")} style={{ margin: 0 }} />}
      {value.map((amenity) => <Tag key={amenity.id}>{amenity.name}</Tag>)}
      {canEdit && (
        <Button size="small" icon={<EditOutlined />} onClick={() => { setSelected(value.map((a) => a.id)); setEditing(true); }}>
          {t("common.edit")}
        </Button>
      )}
    </Flex>
  );
}
