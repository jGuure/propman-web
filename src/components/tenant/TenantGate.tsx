"use client";

import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Result } from "antd";
import type { ReactNode } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { isApiError } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { config } from "@/lib/config";

export function useBranding() {
  const { api } = useTenant();
  return useQuery({ queryKey: ["branding"], queryFn: api.branding, staleTime: 5 * 60_000 });
}

/** Renders the tenant area only for an existing, active organization. */
export function TenantGate({ children }: { children: ReactNode }) {
  const { data, error, refetch } = useBranding();
  if (data) {
    return children;
  }
  if (!error) {
    return <FullPageSpinner />;
  }
  const home = (
    <Button type="primary" href={config.rootUrl}>
      Go to PropManagement
    </Button>
  );
  let result: ReactNode;
  if (isApiError(error, "TENANT_NOT_FOUND")) {
    result = (
      <Result status="404" title="Organization not found"
        subTitle="There is no organization at this address. Check the link or register your company." extra={home} />
    );
  } else if (isApiError(error, "TENANT_SUSPENDED")) {
    result = (
      <Result status="403" title="Organization suspended"
        subTitle="Access to this organization is currently suspended. Please contact IL Software support."
        extra={home} />
    );
  } else {
    result = (
      <Result status="error" title="Cannot load this organization" subTitle={error.message}
        extra={<Button onClick={() => refetch()}>Try again</Button>} />
    );
  }
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      {result}
    </Flex>
  );
}
