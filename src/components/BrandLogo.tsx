"use client";

import { Avatar } from "antd";
import { brand } from "@/lib/theme";

/** Organization logo; falls back to its initials when there is no logo or the image cannot be loaded. */
export function BrandLogo({ name, logoUrl, size = 48 }: { name: string; logoUrl?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <Avatar shape="square" size={size} src={logoUrl || undefined} alt={name}
      style={{ background: logoUrl ? "#fff" : brand.primary, fontWeight: 600 }}>
      {initials || "P"}
    </Avatar>
  );
}
