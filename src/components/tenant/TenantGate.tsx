"use client";

import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Result } from "antd";
import type { ReactNode } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useT } from "@/i18n/provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { config } from "@/lib/config";

export function useBranding() {
  const { api } = useTenant();
  return useQuery({ queryKey: ["branding"], queryFn: api.branding, staleTime: 5 * 60_000 });
}

/** Renders the tenant area only for an existing, active organization. */
export function TenantGate({ children }: { children: ReactNode }) {
  const { data, error, refetch } = useBranding();
  const { t } = useT();
  if (data) {
    return children;
  }
  if (!error) {
    return <FullPageSpinner />;
  }
  const home = (
    <Button type="primary" href={config.rootUrl}>
      {t("gate.goHome")}
    </Button>
  );
  let result: ReactNode;
  if (isApiError(error, "TENANT_NOT_FOUND")) {
    result = (
      <Result status="404" title={t("gate.notFoundTitle")}
        subTitle={t("gate.notFoundText")} extra={home} />
    );
  } else if (isApiError(error, "TENANT_PENDING_REVIEW")) {
    result = (
      <Result status="info" title={t("gate.pendingTitle")} subTitle={t("gate.pendingText")} extra={home} />
    );
  } else if (isApiError(error, "TENANT_SUSPENDED")) {
    result = (
      <Result status="403" title={t("gate.suspendedTitle")}
        subTitle={t("gate.suspendedText")}
        extra={home} />
    );
  } else {
    result = (
      <Result status="error" title={t("gate.errorTitle")} subTitle={errorMessage(error)}
        extra={<Button onClick={() => refetch()}>{t("common.tryAgain")}</Button>} />
    );
  }
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      {result}
    </Flex>
  );
}
