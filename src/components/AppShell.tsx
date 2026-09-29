"use client";

import { DownOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Flex, Layout, Menu, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LanguageSwitcher, useT } from "@/i18n/provider";
import { useIsMobile } from "@/lib/responsive";
import { brand as brandColors } from "@/lib/theme";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
}

interface AppShellProps {
  brand: ReactNode;
  /** Just the logo, shown when the sidebar is collapsed. */
  logo: ReactNode;
  /** Shown in the top bar on phones, where the sidebar (and its brand) is hidden. */
  title: string;
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

/**
 * Signed-in layout: collapsible sidebar, top bar with the user menu, content area. On phones the sidebar becomes a
 * slide-in menu opened from the top bar, which closes again once a page is picked.
 */
export function AppShell({ brand, logo, title, nav, userName, userDetail, userMenu, onSignOut, pathPrefix, translated = false, children }: AppShellProps) {
  const { t } = useT();
  const mobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname().replace(new RegExp(`^${pathPrefix}(?=/|$)`), "") || "/";
  const selected = nav.filter((item) => path === item.href || path.startsWith(`${item.href}/`)).map((i) => i.key);
  const toggleLabel = translated ? t("nav.toggleMenu") : "Toggle menu";

  const items: MenuProps["items"] = [
    ...(userMenu ?? []),
    ...(userMenu && userMenu.length ? [{ type: "divider" as const }] : []),
    { key: "sign-out", icon: <LogoutOutlined />, label: translated ? t("common.signOut") : "Sign out", onClick: onSignOut },
  ];
  const menu = (
    <Menu theme="dark" mode="inline" selectedKeys={selected} onClick={() => setMenuOpen(false)}
      items={nav.map((item) => ({ key: item.key, icon: item.icon, label: <Link href={item.href}>{item.label}</Link> }))} />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!mobile && (
        <Layout.Sider collapsible collapsed={collapsed} trigger={null} width={232} collapsedWidth={72}>
          {/* collapsed: only the logo, centred at its normal size (the name would be cut to "H…") */}
          <div style={{ padding: collapsed ? "20px 0" : "20px 20px", overflow: "hidden", display: collapsed ? "flex" : "block", justifyContent: "center" }}>
            {collapsed ? logo : brand}
          </div>
          {menu}
        </Layout.Sider>
      )}
      {mobile && (
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} placement="left" size={272} closable={false}
          styles={{ body: { padding: 0, background: brandColors.dark } }}>
          <div style={{ padding: "20px 20px" }}>{brand}</div>
          {menu}
        </Drawer>
      )}
      <Layout style={{ minWidth: 0 }}>
        <Layout.Header style={{ padding: mobile ? "0 8px" : "0 16px", borderBottom: "1px solid #eef0f0", position: "sticky", top: 0, zIndex: 10 }}>
          <Flex justify="space-between" align="center" gap={8} style={{ height: "100%" }}>
            <Flex align="center" gap={4} style={{ minWidth: 0 }}>
              <Button type="text" aria-label={toggleLabel} size={mobile ? "large" : "middle"}
                icon={mobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => (mobile ? setMenuOpen(true) : setCollapsed(!collapsed))} />
              {mobile && <Typography.Text strong ellipsis style={{ fontSize: 16 }}>{title}</Typography.Text>}
            </Flex>
            <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
              {translated && <LanguageSwitcher />}
              <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
                <Button type="text" style={{ height: 48 }}>
                  <Flex align="center" gap={8}>
                    <Avatar size="small">{userName.charAt(0).toUpperCase()}</Avatar>
                    {!mobile && (
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
        <Layout.Content style={{ padding: mobile ? "16px 12px 24px" : 24 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
