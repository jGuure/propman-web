"use client";

import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useTenant } from "@/lib/auth/tenant-context";

/** Printable pages (receipts, statements): signed in, but without the menu and header. */
export default function PrintLayout({ children }: LayoutProps<"/tenant">) {
  const { ready, isAuthenticated } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return <FullPageSpinner />;
  }
  return <div className="print-bg" style={{ minHeight: "100vh", background: "#f3f5f5" }}>{children}</div>;
}
