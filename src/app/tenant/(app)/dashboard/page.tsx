"use client";

import { AppstoreOutlined, HomeOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Skeleton, Statistic, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { StatusBar } from "@/components/portfolio/StatusBar";
import { UnitDrawer } from "@/components/portfolio/UnitDrawer";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import { useMe, useTenant } from "@/lib/auth/tenant-context";
import { tenantUrl } from "@/lib/config";
import { formatMoney, formatPercent } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";

function DashboardPage() {
  const { api } = useTenant();
  const { data: me } = useMe();
  const { t, tn } = useT();
  const router = useRouter();
  const { canManage } = usePortfolioPermissions();
  const welcome = useSearchParams().get("welcome");
  const [openUnit, setOpenUnit] = useState<string>();
  const summary = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { canReadPayments } = usePortfolioPermissions();
  const rent = useQuery({
    queryKey: ["collection-summary", "dashboard"], queryFn: () => api.collectionSummary(), enabled: canReadPayments,
  });
  const { canManageExpenses } = usePortfolioPermissions();
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const spent = useQuery({
    queryKey: ["expense-summary", { month: monthStart }], queryFn: () => api.expenseSummary({ month: monthStart }),
    enabled: canManageExpenses,
  });

  if (!me) {
    return null;
  }
  const s = summary.data;
  const firstName = me.user.fullName.split(" ")[0];

  return (
    <>
      <PageHeader title={t("dashboard.welcome", { name: firstName })} description={me.organization.name} />
      {welcome && (
        <Alert type="success" showIcon closable style={{ marginBottom: 20 }} title={t("dashboard.readyTitle")}
          description={t("dashboard.readyText", { name: me.organization.name, url: tenantUrl(me.organization.slug) })} />
      )}
      {summary.error && <Alert type="error" showIcon title={errorMessage(summary.error)} style={{ marginBottom: 16 }} />}
      {summary.isPending && <Card><Skeleton active /></Card>}
      {s && s.properties === 0 && (
        <Card>
          <Empty image={<HomeOutlined style={{ fontSize: 56, color: "#0f766e" }} />}
            description={<>
              <Typography.Title level={4}>{t("dashboard.noPropertiesTitle")}</Typography.Title>
              <Typography.Text type="secondary">{t("dashboard.noPropertiesText")}</Typography.Text>
            </>}>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/properties?add=1")}>
                {t("dashboard.addFirstProperty")}
              </Button>
            )}
          </Empty>
        </Card>
      )}
      {s && s.properties > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={12} lg={6}>
            <Card><Statistic title={t("dashboard.properties")} value={s.properties} prefix={<HomeOutlined />} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card><Statistic title={t("dashboard.apartments")} value={s.units} prefix={<AppstoreOutlined />}
              suffix={<Typography.Text type="secondary" style={{ fontSize: 14 }}>{t("dashboard.inFlats", { count: s.buildings })}</Typography.Text>} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card><Statistic title={t("dashboard.available")} value={s.unitsByStatus.VACANT} styles={{ content: { color: "#16a34a" } }} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic title={t("dashboard.potentialRent")} value=" "
                formatter={() => formatMoney(s.potentialMonthlyRent.reduce((sum, r) => sum + r.amount, 0))} />
            </Card>
          </Col>
          {canReadPayments && rent.data && rent.data.expected > 0 && (
            <Col xs={24}>
              <Card size="small">
                <Flex justify="space-between" align="center" wrap gap={16}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <Typography.Text type="secondary">{t("payments.rentThisMonth")}</Typography.Text>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>
                      {t("payments.ofExpected", { collected: formatMoney(rent.data.collected), expected: formatMoney(rent.data.expected) })}
                    </div>
                    <Progress percent={Math.round((rent.data.collected / rent.data.expected) * 100)} size="small" style={{ margin: 0, maxWidth: 420 }} />
                  </div>
                  <Flex gap={24} wrap align="center">
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("collect.outstanding")}</Typography.Text>
                      <div style={{ fontWeight: 600, color: rent.data.outstanding > 0 ? "#cf1322" : undefined }}>{formatMoney(rent.data.outstanding)}</div>
                    </div>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("collect.toCheck")}</Typography.Text>
                      <div style={{ fontWeight: 600 }}>{rent.data.needsCheck}</div>
                    </div>
                    {spent.data && (
                      <>
                        <div>
                          <Link href="/expenses"><Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("expenses.thisMonth")}</Typography.Text></Link>
                          <div style={{ fontWeight: 600 }}>{formatMoney(spent.data.total)}</div>
                        </div>
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("expenses.net")}</Typography.Text>
                          <div style={{ fontWeight: 600, color: rent.data.collected - spent.data.total < 0 ? "#cf1322" : "#16a34a" }}>
                            {formatMoney(rent.data.collected - spent.data.total)}
                          </div>
                        </div>
                      </>
                    )}
                    <Link href={rent.data.needsCheck > 0 ? "/collect?filter=check" : "/collect"}>
                      <Button type="primary">{t("payments.goCollect")}</Button>
                    </Link>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          )}
          <Col xs={24} lg={8}>
            <Card title={t("dashboard.occupancy")} style={{ height: "100%" }}>
              <Flex vertical align="center" gap={12}>
                <Progress type="circle" percent={Math.round(s.occupancyRate * 100)} size={140}
                  format={() => formatPercent(s.occupancyRate)} strokeColor="#3b82f6" />
                <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: 13 }}>
                  {t("dashboard.occupancyHelp")}
                </Typography.Text>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card title={t("dashboard.byStatus")} style={{ height: "100%" }} extra={<Link href="/units">{t("dashboard.allApartments")}</Link>}>
              <StatusBar counts={s.unitsByStatus} />
              <Typography.Title level={5} style={{ marginTop: 24 }}>{t("dashboard.longestAvailable")}</Typography.Title>
              <ResponsiveTable size="small" rowKey="id" pagination={false} dataSource={s.vacantUnits}
                locale={{ emptyText: t("dashboard.noAvailable") }}
                onRow={(row) => ({ onClick: () => setOpenUnit(row.id), style: { cursor: "pointer" } })}
                columns={[
                  { title: t("dashboard.apartment"), dataIndex: "unitNumber", render: (n: string) => <Typography.Link strong>{n}</Typography.Link> },
                  { title: t("dashboard.property"), key: "property", render: (_, r) => r.buildingName ? `${r.propertyName} · ${r.buildingName}` : r.propertyName },
                  { title: t("common.rent"), key: "rent", align: "right", render: (_, r) => formatMoney(r.baseRent) },
                  { title: t("dashboard.availableFor"), dataIndex: "vacantDays", align: "right", render: (d: number) => (d === 0 ? t("common.today") : tn("common.days", d)) },
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
