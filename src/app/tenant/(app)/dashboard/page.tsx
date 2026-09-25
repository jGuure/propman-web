"use client";

import { CheckCircleFilled, ClockCircleOutlined, TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Col, Descriptions, List, Row, Statistic, Typography } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useMe, useTenant } from "@/lib/auth/tenant-context";
import { tenantUrl } from "@/lib/config";

function DashboardPage() {
  const { api } = useTenant();
  const { data: me } = useMe();
  const welcome = useSearchParams().get("welcome");
  const canReadUsers = me?.permissions.includes("users:read") ?? false;
  const canManage = me?.permissions.includes("users:manage") ?? false;
  const active = useQuery({
    queryKey: ["users", "count", "ACTIVE"],
    queryFn: () => api.users({ status: "ACTIVE", page: 0, size: 1 }),
    enabled: canReadUsers,
  });
  const invited = useQuery({
    queryKey: ["users", "count", "INVITED"],
    queryFn: () => api.users({ status: "INVITED", page: 0, size: 1 }),
    enabled: canReadUsers,
  });
  if (!me) {
    return null;
  }
  const { user, organization } = me;
  const steps = [
    { done: !!organization.logoUrl, label: "Upload your company logo", href: "/settings/organization" },
    { done: !!organization.address && !!organization.phone, label: "Complete the organization profile", href: "/settings/organization" },
    { done: (active.data?.totalElements ?? 0) + (invited.data?.totalElements ?? 0) > 1, label: "Invite your team", href: "/users" },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${user.fullName.split(" ")[0]}`} description={organization.name} />
      {welcome && (
        <Alert type="success" showIcon closable style={{ marginBottom: 20 }} title="Your organization is ready"
          description={`${organization.name} is live at ${tenantUrl(organization.slug)}. Bookmark it — this is where your team signs in.`} />
      )}
      <Row gutter={[16, 16]}>
        {canReadUsers && (
          <>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Active users" value={active.data?.totalElements ?? "–"} prefix={<TeamOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Pending invitations" value={invited.data?.totalElements ?? "–"} prefix={<ClockCircleOutlined />} /></Card>
            </Col>
          </>
        )}
        <Col xs={24} lg={canReadUsers ? 12 : 24}>
          <Card title="Organization" extra={<Link href="/settings/organization">View</Link>}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Address">{tenantUrl(organization.slug)}</Descriptions.Item>
              <Descriptions.Item label="City">{organization.city ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Currency">{organization.currency}</Descriptions.Item>
              <Descriptions.Item label="Time zone">{organization.timezone}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        {canManage && (
          <Col xs={24}>
            <Card title="Getting started">
              <List dataSource={steps} renderItem={(step) => (
                <List.Item>
                  <Link href={step.href} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {step.done ? <CheckCircleFilled style={{ color: "#16a34a" }} /> : <UserAddOutlined />}
                    <Typography.Text delete={step.done}>{step.label}</Typography.Text>
                  </Link>
                </List.Item>
              )} />
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
