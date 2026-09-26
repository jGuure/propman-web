"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Flex, Modal, Space, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo, useState } from "react";
import { errorMessage } from "@/lib/api/errors";
import type { PropertyStructure, StructureApartment } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { useT } from "@/i18n/provider";
import { useLabels } from "@/lib/labels";
import { invalidatePortfolio } from "./invalidate";

interface Props {
  open: boolean;
  source?: StructureApartment;
  structure: PropertyStructure;
  onClose: () => void;
}

interface Located {
  apartment: StructureApartment;
  flatId: string | null;
}

/** Copies one apartment's room layout to other apartments, with quick selections (same flat, same type…). */
export function CopyRoomsModal({ open, source, structure, onClose }: Props) {
  const { api } = useTenant();
  const { t, tn } = useT();
  const labels = useLabels();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<string[]>([]);

  const all: Located[] = useMemo(() => [
    ...structure.flats.flatMap((f) => f.floors.flatMap((fl) => fl.apartments.map((a) => ({ apartment: a, flatId: f.id })))),
    ...structure.unassigned.flatMap((fl) => fl.apartments.map((a) => ({ apartment: a, flatId: null }))),
  ], [structure]);
  const sourceFlat = all.find((l) => l.apartment.id === source?.id)?.flatId ?? null;
  const others = all.filter((l) => l.apartment.id !== source?.id);

  const tree: DataNode[] = [
    ...structure.flats.map((f) => ({
      key: `flat:${f.id}`, title: <Typography.Text strong>{f.name}</Typography.Text>,
      children: f.floors.map((fl) => ({
        key: `floor:${f.id}:${fl.floor}`, title: labels.floor(fl.floor),
        children: fl.apartments.filter((a) => a.id !== source?.id).map(apartmentNode),
      })).filter((n) => n.children.length),
    })).filter((n) => n.children.length),
    ...structure.unassigned.map((fl) => ({
      key: `floor:none:${fl.floor}`, title: t("rooms.noFlatFloor", { floor: labels.floor(fl.floor) }),
      children: fl.apartments.filter((a) => a.id !== source?.id).map(apartmentNode),
    })).filter((n) => n.children.length),
  ];

  function apartmentNode(a: StructureApartment): DataNode {
    return {
      key: a.id,
      title: `${a.unitNumber} · ${labels.unitType(a.type)} · ${a.rooms.length ? tn("count.rooms", a.rooms.length) : t("rooms.noRoomsTag")}`,
    };
  }

  const select = (filter: (l: Located) => boolean) => setChecked(others.filter(filter).map((l) => l.apartment.id));
  const copy = useMutation({
    mutationFn: () => api.copyRooms(source!.id, checked),
    onSuccess: (r) => {
      message.success(tn("rooms.copied", r.updated));
      invalidatePortfolio(queryClient);
      setChecked([]);
      onClose();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <Modal open={open} onCancel={onClose} title={t("rooms.copyTitle", { number: source?.unitNumber ?? "" })} destroyOnHidden
      okText={tn("rooms.copyButton", checked.length)} okButtonProps={{ disabled: !checked.length }}
      confirmLoading={copy.isPending} onOk={() => copy.mutate()} width={560}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        title={t("rooms.copyInfo", { count: source?.rooms.length ?? 0 })} />
      <Space wrap style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">{t("rooms.quickSelect")}</Typography.Text>
        <Button size="small" onClick={() => select((l) => l.flatId === sourceFlat)}>{t("rooms.sameFlat")}</Button>
        <Button size="small" onClick={() => select((l) => l.apartment.type === source?.type)}>
          {t("rooms.sameType", { type: source ? labels.unitType(source.type).toLowerCase() : "" })}
        </Button>
        <Button size="small" onClick={() => select((l) => l.apartment.rooms.length === 0)}>{t("rooms.withoutRooms")}</Button>
        <Button size="small" onClick={() => select(() => true)}>{t("common.all")}</Button>
        <Button size="small" type="link" onClick={() => setChecked([])}>{t("rooms.clear")}</Button>
      </Space>
      <Flex vertical style={{ maxHeight: 360, overflow: "auto", border: "1px solid #f0f0f0", borderRadius: 8, padding: 8 }}>
        <Tree checkable selectable={false} defaultExpandAll treeData={tree}
          checkedKeys={checked} onCheck={(keys) => {
            const list = Array.isArray(keys) ? keys : keys.checked;
            setChecked(list.map(String).filter((k) => !k.includes(":")));
          }} />
      </Flex>
    </Modal>
  );
}


