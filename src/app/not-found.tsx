"use client";

import { Button, Flex, Result } from "antd";
import { config } from "@/lib/config";

export default function NotFound() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      <Result status="404" title="Page not found" subTitle="The page you are looking for does not exist."
        extra={<Button type="primary" href={config.rootUrl}>Go to PropManagement</Button>} />
    </Flex>
  );
}
