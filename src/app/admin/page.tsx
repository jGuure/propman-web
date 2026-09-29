"use client";

import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { usePlatform } from "@/lib/auth/platform-context";

export default function AdminHome() {
  const { ready, isAuthenticated } = usePlatform();
  const router = useRouter();
  useEffect(() => {
    if (ready) {
      router.replace(isAuthenticated ? "/tenants" : "/login");
    }
  }, [ready, isAuthenticated, router]);
  return <FullPageSpinner />;
}
