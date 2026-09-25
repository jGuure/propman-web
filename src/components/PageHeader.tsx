"use client";

import { Flex, Typography } from "antd";
import type { ReactNode } from "react";

export function PageHeader({ title, description, extra }: { title: string; description?: ReactNode; extra?: ReactNode }) {
  return (
    <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 20 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </div>
      {extra}
    </Flex>
  );
}
