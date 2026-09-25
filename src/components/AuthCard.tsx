"use client";

import { Card, Flex, Typography } from "antd";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

interface AuthCardProps {
  title: string;
  subtitle?: ReactNode;
  organizationName?: string;
  logoUrl?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Centered card used by login, registration and other unauthenticated pages. */
export function AuthCard({ title, subtitle, organizationName, logoUrl, children, footer, width = 420 }: AuthCardProps) {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: width }}>
        <Card>
          <Flex vertical align="center" gap={8} style={{ marginBottom: 24, textAlign: "center" }}>
            {organizationName && <BrandLogo name={organizationName} logoUrl={logoUrl} size={56} />}
            {organizationName && (
              <Typography.Text type="secondary" strong>
                {organizationName}
              </Typography.Text>
            )}
            <Typography.Title level={3} style={{ margin: 0 }}>
              {title}
            </Typography.Title>
            {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
          </Flex>
          {children}
        </Card>
        {footer && (
          <Flex justify="center" style={{ marginTop: 16 }}>
            {footer}
          </Flex>
        )}
      </div>
    </Flex>
  );
}
