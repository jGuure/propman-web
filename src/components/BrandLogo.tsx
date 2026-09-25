"use client";

import { Avatar } from "antd";
import { brand } from "@/lib/theme";

/** Organization logo, or its initials when there is none. */
export function BrandLogo({ name, logoUrl, size = 48 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    return <Avatar shape="square" size={size} src={logoUrl} alt={name} style={{ background: "#fff" }} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <Avatar shape="square" size={size} style={{ background: brand.primary, fontWeight: 600 }}>
      {initials || "P"}
    </Avatar>
  );
}
