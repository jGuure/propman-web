"use client";

import { FilterOutlined } from "@ant-design/icons";
import { Badge, Button, Col, Drawer, Flex, Row } from "antd";
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/provider";
import { useIsMobile } from "@/lib/responsive";

/**
 * Wraps a page's secondary filters. On desktop they render exactly as written; on phones they fold into a
 * "Filters (n)" button that opens them in a bottom sheet, so the list starts on the first screen. Keep the search box
 * outside, so it stays visible. `layout="row"` when the filters are antd `<Col>`s inside a `<Row>`.
 */
export function FilterPanel({ active = 0, layout = "flex", children }: {
  /** How many of these filters are set; shown on the button. */
  active?: number;
  layout?: "flex" | "row";
  children: ReactNode;
}) {
  const { t } = useT();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  if (!mobile) {
    return <>{children}</>;
  }

  const button = (
    <Badge count={active} size="small" offset={[-4, 4]}>
      <Button icon={<FilterOutlined />} onClick={() => setOpen(true)}>{t("common.filters")}</Button>
    </Badge>
  );
  const sheet = (
    <Drawer open={open} onClose={() => setOpen(false)} placement="bottom" title={t("common.filters")}
      size="auto" styles={{ body: { paddingBottom: 16 }, wrapper: { maxHeight: "85vh" } }}
      footer={<Button type="primary" block size="large" onClick={() => setOpen(false)}>{t("common.showResults")}</Button>}>
      {layout === "row"
        ? <Row gutter={[12, 12]}>{children}</Row>
        : <Flex vertical gap={12} className="filter-sheet">{children}</Flex>}
    </Drawer>
  );

  return layout === "row"
    ? <Col xs={24}>{button}{sheet}</Col>
    : <>{button}{sheet}</>;
}
