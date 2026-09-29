"use client";

import { ShopOutlined } from "@ant-design/icons";
import { Button, Flex, Result, Typography } from "antd";
import { useRouter } from "nextjs-toploader/app";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandLogo } from "@/components/BrandLogo";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { errorMessage } from "@/lib/api/errors";
import { usePlatform, usePlatformMe } from "@/lib/auth/platform-context";

export default function PlatformAppLayout({ children }: LayoutProps<"/admin">) {
  const { ready, isAuthenticated, signOut } = usePlatform();
  const router = useRouter();
  const me = usePlatformMe();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated || me.isPending) {
    return <FullPageSpinner />;
  }
  if (me.error) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Result status="error" title="Cannot load your account" subTitle={errorMessage(me.error)}
          extra={<Button onClick={signOut}>Sign out</Button>} />
      </Flex>
    );
  }

  return (
    <AppShell
      pathPrefix="/admin"
      title="Platform admin"
      nav={[{ key: "tenants", href: "/tenants", label: "Tenants", icon: <ShopOutlined /> }]}
      userName={me.data.fullName}
      userDetail="Platform admin"
      userMenu={[]}
      onSignOut={signOut}
      logo={<BrandLogo name="Prop Management" size={40} />}
      brand={
        <Flex vertical>
          <Typography.Text strong style={{ color: "#fff", fontSize: 16, whiteSpace: "nowrap" }}>PropManagement</Typography.Text>
          <Typography.Text style={{ color: "#99f6e4", fontSize: 12, whiteSpace: "nowrap" }}>Platform admin</Typography.Text>
        </Flex>
      }>
      {children}
    </AppShell>
  );
}
