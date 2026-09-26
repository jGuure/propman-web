"use client";

import { DownOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Flex, Grid, Layout, Menu, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher, useT } from "@/i18n/provider";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
}

interface AppShellProps {
  brand: ReactNode;
  nav: NavItem[];
  userName: string;
  userDetail: string;
  userMenu: MenuProps["items"];
  onSignOut: () => void;
  /** Strip this prefix from the path before matching nav items (rewritten areas). */
  pathPrefix: string;
  /** Translated texts and the EN / SO switcher (tenant area); the platform admin area stays in English. */
  translated?: boolean;
  children: ReactNode;
}

/** Signed-in layout: collapsible sidebar, top bar with the user menu, content area. */
export function AppShell({ brand, nav, userName, userDetail, userMenu, onSignOut, pathPrefix, translated = false, children }: AppShellProps) {
  const { t } = useT();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const path = usePathname().replace(new RegExp(`^${pathPrefix}(?=/|$)`), "") || "/";
  const selected = nav.filter((item) => path === item.href || path.startsWith(`${item.href}/`)).map((i) => i.key);
  const isCollapsed = collapsed || !screens.md;

  const items: MenuProps["items"] = [
    ...(userMenu ?? []),
    ...(userMenu && userMenu.length ? [{ type: "divider" as const }] : []),
    { key: "sign-out", icon: <LogoutOutlined />, label: translated ? t("common.signOut") : "Sign out", onClick: onSignOut },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider collapsible collapsed={isCollapsed} trigger={null} width={232} collapsedWidth={screens.md ? 72 : 0}>
        <div style={{ padding: isCollapsed ? "20px 12px" : "20px 20px", overflow: "hidden" }}>{brand}</div>
        <Menu theme="dark" mode="inline" selectedKeys={selected}
          items={nav.map((item) => ({ key: item.key, icon: item.icon, label: <Link href={item.href}>{item.label}</Link> }))} />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ padding: "0 16px", borderBottom: "1px solid #eef0f0" }}>
          <Flex justify="space-between" align="center" style={{ height: "100%" }}>
            <Button type="text" aria-label={translated ? t("nav.toggleMenu") : "Toggle menu"}
              icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!isCollapsed)} />
            <Flex align="center" gap={4}>
            {translated && <LanguageSwitcher />}
            <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
              <Button type="text" style={{ height: 48 }}>
                <Flex align="center" gap={8}>
                  <Avatar size="small">{userName.charAt(0).toUpperCase()}</Avatar>
                  {screens.sm && (
                    <Flex vertical align="start" style={{ lineHeight: 1.2 }}>
                      <Typography.Text strong>{userName}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{userDetail}</Typography.Text>
                    </Flex>
                  )}
                  <DownOutlined style={{ fontSize: 10 }} />
                </Flex>
              </Button>
            </Dropdown>
            </Flex>
          </Flex>
        </Layout.Header>
        <Layout.Content style={{ padding: screens.md ? 24 : 12 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
