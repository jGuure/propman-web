"use client";

import { ExportOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import type { MouseEvent, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/provider";

/** One preview at a time, opened from anywhere (links, menus, notifications) and shown by PrintPreviewHost. */
let current: string | null = null;
const listeners = new Set<() => void>();

function set(href: string | null) {
  current = href;
  listeners.forEach((l) => l());
}

export function openPrintPreview(href: string) {
  set(href);
}

/** Plain click opens the preview; ctrl/cmd/middle click still opens the page in a new tab. */
export function previewClick(href: string) {
  return (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    set(href);
  };
}

/** A link to a print page (receipt, statement, report) that opens it in the preview modal. */
export function PrintLink({ href, children, style }: { href: string; children: ReactNode; style?: React.CSSProperties }) {
  return <a href={href} target="_blank" rel="noreferrer" onClick={previewClick(href)} style={style}>{children}</a>;
}

/** Mounted once in the app layout: the document in a modal, printed from its own Print button. */
export function PrintPreviewHost() {
  const { t } = useT();
  const href = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
    () => null,
  );

  return (
    <Modal open={href !== null} onCancel={() => set(null)} footer={null} width={880} destroyOnHidden centered
      title={
        <span>
          {t("receipts.preview")}
          {href && (
            <Tooltip title={t("receipts.openNewTab")}>
              <Button type="text" size="small" icon={<ExportOutlined />} href={href} target="_blank" style={{ marginLeft: 8 }} />
            </Tooltip>
          )}
        </span>
      }
      styles={{ body: { padding: 0 } }}>
      {href && (
        <iframe key={href} src={href} title={t("receipts.preview")}
          style={{ width: "100%", height: "calc(100vh - 140px)", border: 0, borderRadius: 8, background: "#f5f5f5" }} />
      )}
    </Modal>
  );
}
