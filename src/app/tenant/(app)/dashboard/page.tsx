"use client";

import { AppstoreOutlined, HomeOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Skeleton, Statistic, Table, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBar } from "@/components/portfolio/StatusBar";
import { UnitDrawer } from "@/components/portfolio/UnitDrawer";
import { errorMessage } from "@/lib/api/errors";
import { useMe, useTenant } from "@/lib/auth/tenant-context";
import { tenantUrl } from "@/lib/config";
import { formatMoney, formatPercent } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";

function DashboardPage() {
  const { api } = useTenant();
  const { data: me } = useMe();
  const router = useRouter();
  const { canManage } = usePortfolioPermissions();
  const welcome = useSearchParams().get("welcome");
  const [openUnit, setOpenUnit] = useState<string>();
  const summary = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

  if (!me) {
    return null;
  }
  const s = summary.data;
  const firstName = me.user.fullName.split(" ")[0];

  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description={me.organization.name} />
      {welcome && (
        <Alert type="success" showIcon closable style={{ marginBottom: 20 }} title="Your organization is ready"
          description={`${me.organization.name} is live at ${tenantUrl(me.organization.slug)}. Start by adding your first property.`} />
      )}
      {summary.error && <Alert type="error" showIcon title={errorMessage(summary.error)} style={{ marginBottom: 16 }} />}
      {summary.isPending && <Card><Skeleton active /></Card>}
      {s && s.properties === 0 && (
        <Card>
          <Empty image={<HomeOutlined style={{ fontSize: 56, color: "#0f766e" }} />}
            description={<>
              <Typography.Title level={4}>No properties yet</Typography.Title>
              <Typography.Text type="secondary">Add a property, its buildings and units to see occupancy and rent here.</Typography.Text>
            </>}>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/properties?add=1")}>
                Add your first property
              </Button>
            )}
          </Empty>
        </Card>
      )}
      {s && s.properties > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={12} lg={6}>
            <Card><Statistic title="Properties" value={s.properties} prefix={<HomeOutlined />} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card><Statistic title="Units" value={s.units} prefix={<AppstoreOutlined />}
              suffix={<Typography.Text type="secondary" style={{ fontSize: 14 }}>in {s.buildings} buildings</Typography.Text>} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card><Statistic title="Vacant units" value={s.unitsByStatus.VACANT} styles={{ content: { color: "#16a34a" } }} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic title="Potential monthly rent" value=" " formatter={() => (
                <Flex vertical>
                  {s.potentialMonthlyRent.length === 0 ? "—" : s.potentialMonthlyRent.map((r) => (
                    <span key={r.currency}>{formatMoney(r.amount, r.currency)}</span>
                  ))}
                </Flex>
              )} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Occupancy" style={{ height: "100%" }}>
              <Flex vertical align="center" gap={12}>
                <Progress type="circle" percent={Math.round(s.occupancyRate * 100)} size={140}
                  format={() => formatPercent(s.occupancyRate)} strokeColor="#3b82f6" />
                <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: 13 }}>
                  Occupied units out of all units that can be rented (inactive units excluded).
                </Typography.Text>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card title="Units by status" style={{ height: "100%" }} extra={<Link href="/units">All units</Link>}>
              <StatusBar counts={s.unitsByStatus} />
              <Typography.Title level={5} style={{ marginTop: 24 }}>Longest vacant units</Typography.Title>
              <Table size="small" rowKey="id" pagination={false} dataSource={s.vacantUnits}
                locale={{ emptyText: "No vacant units" }}
                onRow={(row) => ({ onClick: () => setOpenUnit(row.id), style: { cursor: "pointer" } })}
                columns={[
                  { title: "Unit", dataIndex: "unitNumber", render: (n: string) => <Typography.Link strong>{n}</Typography.Link> },
                  { title: "Property", key: "property", render: (_, r) => r.buildingName ? `${r.propertyName} · ${r.buildingName}` : r.propertyName },
                  { title: "Rent", key: "rent", align: "right", render: (_, r) => formatMoney(r.baseRent, r.currency) },
                  { title: "Vacant for", dataIndex: "vacantDays", align: "right", render: (d: number) => (d === 0 ? "Today" : `${d} day${d === 1 ? "" : "s"}`) },
                ]} />
            </Card>
          </Col>
        </Row>
      )}
      <UnitDrawer unitId={openUnit} onClose={() => setOpenUnit(undefined)} />
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
