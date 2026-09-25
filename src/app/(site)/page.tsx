"use client";

import { ApartmentOutlined, SafetyOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, Form, Input, Row, Space, Typography } from "antd";
import Link from "next/link";
import { config, tenantHostSuffix, tenantUrl } from "@/lib/config";
import { navigateToOrigin } from "@/lib/navigation";
import { brand } from "@/lib/theme";

const FEATURES = [
  { icon: <ApartmentOutlined />, title: "Your own workspace", text: "Every company gets a private address and its own separate database." },
  { icon: <TeamOutlined />, title: "Your whole team", text: "Invite managers, accountants and staff with the right level of access." },
  { icon: <SafetyOutlined />, title: "Secure by design", text: "Company data is fully isolated, and every sign-in is protected." },
];

export default function LandingPage() {
  return (
    <div>
      <div style={{ background: brand.dark, color: "#fff", padding: "72px 16px 96px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Typography.Text style={{ color: "#99f6e4", fontWeight: 600 }}>IL Software</Typography.Text>
          <Typography.Title style={{ color: "#fff", marginTop: 8, fontSize: 44 }}>
            Property management for apartments and flats
          </Typography.Title>
          <Typography.Paragraph style={{ color: "#d1e7e4", fontSize: 18, maxWidth: 620 }}>
            Manage your buildings, units, residents and team from one place. Register your company and start in minutes.
          </Typography.Paragraph>
          <Space size="middle" wrap>
            <Link href="/register"><Button type="primary" size="large">Register your company</Button></Link>
            <Button size="large" ghost href="#sign-in">Sign in</Button>
          </Space>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "-48px auto 0", padding: "0 16px 64px" }}>
        <Row gutter={[16, 16]}>
          {FEATURES.map((feature) => (
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
          <Typography.Title level={4} style={{ marginTop: 0 }}>Sign in to your company</Typography.Title>
          <Typography.Paragraph type="secondary">Enter your company&apos;s address to go to its sign-in page.</Typography.Paragraph>
          <Form layout="inline" onFinish={({ slug }: { slug: string }) => navigateToOrigin(`${tenantUrl(slug.trim().toLowerCase())}/login`)}>
            <Form.Item style={{ marginBottom: 8 }}>
              <Space.Compact>
                <Form.Item name="slug" noStyle rules={[{ required: true, message: "Enter your company address" },
                  { pattern: /^[a-zA-Z0-9-]{3,30}$/, message: "Letters, digits and hyphens" }]}>
                  <Input placeholder="your-company" style={{ width: 200 }} />
                </Form.Item>
                <Space.Addon>.{tenantHostSuffix()}</Space.Addon>
              </Space.Compact>
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit">Continue</Button>
            </Form.Item>
          </Form>
        </Card>
        <Flex justify="center" style={{ marginTop: 32 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            © IL Software · <a href={config.adminUrl}>Platform administration</a>
          </Typography.Text>
        </Flex>
      </div>
    </div>
  );
}
