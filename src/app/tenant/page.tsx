"use client";

import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useTenant } from "@/lib/auth/tenant-context";

export default function TenantHome() {
  const { ready, isAuthenticated } = useTenant();
  const router = useRouter();
  useEffect(() => {
    if (ready) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [ready, isAuthenticated, router]);
  return <FullPageSpinner />;
}
