"use client";

import { AppstoreOutlined, DashboardOutlined, HomeOutlined, SettingOutlined, TagsOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Flex, Result, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { BrandLogo } from "@/components/BrandLogo";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { ROLE_LABELS } from "@/components/tags";
import { errorMessage } from "@/lib/api/errors";
import { useMe, useTenant } from "@/lib/auth/tenant-context";

export default function TenantAppLayout({ children }: LayoutProps<"/tenant">) {
  const { ready, isAuthenticated, signOut } = useTenant();
  const router = useRouter();
  const me = useMe();

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
          extra={[<Button key="retry" onClick={() => me.refetch()}>Try again</Button>,
            <Button key="out" onClick={signOut}>Sign out</Button>]} />
      </Flex>
    );
  }

  const { user, organization, permissions } = me.data;
  const nav: NavItem[] = [
    { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { key: "properties", href: "/properties", label: "Properties", icon: <HomeOutlined /> },
    { key: "units", href: "/units", label: "Apartments", icon: <AppstoreOutlined /> },
    ...(permissions.includes("users:read")
      ? [{ key: "users", href: "/users", label: "Users", icon: <TeamOutlined /> }] : []),
    { key: "organization", href: "/settings/organization", label: "Organization", icon: <SettingOutlined /> },
    { key: "amenities", href: "/settings/amenities", label: "Amenities", icon: <TagsOutlined /> },
  ];

  return (
    <AppShell
      pathPrefix="/tenant"
      nav={nav}
      userName={user.fullName}
      userDetail={ROLE_LABELS[user.role]}
      onSignOut={signOut}
      userMenu={[{ key: "profile", icon: <UserOutlined />, label: "My profile", onClick: () => router.push("/profile") }]}
      brand={
        <Flex align="center" gap={10}>
          <BrandLogo name={organization.name} logoUrl={organization.logoUrl} size={36} />
          <Typography.Text strong ellipsis style={{ color: "#fff", maxWidth: 160 }}>{organization.name}</Typography.Text>
        </Flex>
      }>
      {children}
    </AppShell>
  );
}
