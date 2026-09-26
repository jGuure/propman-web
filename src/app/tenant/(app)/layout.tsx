"use client";

import { AppstoreOutlined, DashboardOutlined, HomeOutlined, SettingOutlined, TagsOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Flex, Result, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { BrandLogo } from "@/components/BrandLogo";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import { useMe, useTenant } from "@/lib/auth/tenant-context";

export default function TenantAppLayout({ children }: LayoutProps<"/tenant">) {
  const { ready, isAuthenticated, signOut } = useTenant();
  const router = useRouter();
  const me = useMe();
  const { t } = useT();

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
        <Result status="error" title={t("gate.accountErrorTitle")} subTitle={errorMessage(me.error)}
          extra={[<Button key="retry" onClick={() => me.refetch()}>{t("common.tryAgain")}</Button>,
            <Button key="out" onClick={signOut}>{t("common.signOut")}</Button>]} />
      </Flex>
    );
  }

  const { user, organization, permissions } = me.data;
  const nav: NavItem[] = [
    { key: "dashboard", href: "/dashboard", label: t("nav.dashboard"), icon: <DashboardOutlined /> },
    { key: "properties", href: "/properties", label: t("nav.properties"), icon: <HomeOutlined /> },
    { key: "units", href: "/units", label: t("nav.apartments"), icon: <AppstoreOutlined /> },
    ...(permissions.includes("users:read")
      ? [{ key: "users", href: "/users", label: t("nav.users"), icon: <TeamOutlined /> }] : []),
    { key: "organization", href: "/settings/organization", label: t("nav.organization"), icon: <SettingOutlined /> },
    { key: "amenities", href: "/settings/amenities", label: t("nav.amenities"), icon: <TagsOutlined /> },
  ];

  return (
    <AppShell
      pathPrefix="/tenant"
      translated
      nav={nav}
      userName={user.fullName}
      userDetail={t(`roles.${user.role}`)}
      onSignOut={signOut}
      userMenu={[{ key: "profile", icon: <UserOutlined />, label: t("nav.myProfile"), onClick: () => router.push("/profile") }]}
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
