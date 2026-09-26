"use client";

import { Button, Flex, Result } from "antd";
import { useT } from "@/i18n/provider";
import { config } from "@/lib/config";

export default function NotFound() {
  const { t } = useT();
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      <Result status="404" title={t("gate.pageNotFound")} subTitle={t("gate.pageNotFoundText")}
        extra={<Button type="primary" href={config.rootUrl}>{t("gate.goHome")}</Button>} />
    </Flex>
  );
}
