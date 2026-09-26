"use client";

import { ApartmentOutlined, SafetyOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, Form, Input, Row, Space, Typography } from "antd";
import Link from "next/link";
import { LanguageSwitcher, useT } from "@/i18n/provider";
import { config, tenantHostSuffix, tenantUrl } from "@/lib/config";
import { navigateToOrigin } from "@/lib/navigation";
import { brand } from "@/lib/theme";

export default function LandingPage() {
  const { t } = useT();
  const features = [
    { icon: <ApartmentOutlined />, title: t("site.feature1Title"), text: t("site.feature1Text") },
    { icon: <TeamOutlined />, title: t("site.feature2Title"), text: t("site.feature2Text") },
    { icon: <SafetyOutlined />, title: t("site.feature3Title"), text: t("site.feature3Text") },
  ];
  return (
    <div>
      <div style={{ background: brand.dark, color: "#fff", padding: "72px 16px 96px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Flex justify="space-between" align="center">
            <Typography.Text style={{ color: "#99f6e4", fontWeight: 600 }}>{t("site.brand")}</Typography.Text>
            <LanguageSwitcher light />
          </Flex>
          <Typography.Title style={{ color: "#fff", marginTop: 8, fontSize: 44 }}>
            {t("site.heroTitle")}
          </Typography.Title>
          <Typography.Paragraph style={{ color: "#d1e7e4", fontSize: 18, maxWidth: 620 }}>
            {t("site.heroText")}
          </Typography.Paragraph>
          <Space size="middle" wrap>
            <Link href="/register"><Button type="primary" size="large">{t("site.registerCta")}</Button></Link>
            <Button size="large" ghost href="#sign-in">{t("site.signInCta")}</Button>
          </Space>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "-48px auto 0", padding: "0 16px 64px" }}>
        <Row gutter={[16, 16]}>
          {features.map((feature) => (
            <Col xs={24} md={8} key={feature.title}>
              <Card style={{ height: "100%" }}>
                <div style={{ fontSize: 28, color: brand.primary }}>{feature.icon}</div>
                <Typography.Title level={5}>{feature.title}</Typography.Title>
                <Typography.Text type="secondary">{feature.text}</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
        <Card id="sign-in" style={{ marginTop: 24 }}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>{t("site.signInTitle")}</Typography.Title>
          <Typography.Paragraph type="secondary">{t("site.signInText")}</Typography.Paragraph>
          <Form layout="inline" onFinish={({ slug }: { slug: string }) => navigateToOrigin(`${tenantUrl(slug.trim().toLowerCase())}/login`)}>
            <Form.Item style={{ marginBottom: 8 }}>
              <Space.Compact>
                <Form.Item name="slug" noStyle rules={[{ required: true, message: t("site.enterAddress") },
                  { pattern: /^[a-zA-Z0-9-]{3,30}$/, message: t("site.addressFormat") }]}>
                  <Input placeholder="your-company" style={{ width: 200 }} />
                </Form.Item>
                <Space.Addon>.{tenantHostSuffix()}</Space.Addon>
              </Space.Compact>
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit">{t("site.continue")}</Button>
            </Form.Item>
          </Form>
        </Card>
        <Flex justify="center" style={{ marginTop: 32 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            © IL Software · <a href={config.adminUrl}>{t("site.platformAdmin")}</a>
          </Typography.Text>
        </Flex>
      </div>
    </div>
  );
}
