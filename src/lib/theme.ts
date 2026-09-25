import type { ThemeConfig } from "antd";

export const brand = {
  primary: "#0f766e",
  dark: "#0b3b36",
};

export const theme: ThemeConfig = {
  token: {
    colorPrimary: brand.primary,
    colorLink: brand.primary,
    borderRadius: 8,
    fontFamily:
      "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: { siderBg: brand.dark, headerBg: "#ffffff", bodyBg: "#f5f7f7" },
    Menu: { darkItemBg: brand.dark, darkSubMenuItemBg: brand.dark, darkItemSelectedBg: brand.primary },
  },
};
