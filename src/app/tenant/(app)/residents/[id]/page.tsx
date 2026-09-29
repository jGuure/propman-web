"use client";

import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, InboxOutlined, MailOutlined, MoreOutlined, PhoneOutlined, UndoOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Col, Dropdown, Empty, Flex, Result, Row, Skeleton, Space, Tabs, Tag, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useState, type ReactNode } from "react";
import { LeaseCard } from "@/components/leases/LeaseCard";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Sensitive } from "@/components/Sensitive";
import { PrintLink } from "@/components/payments/PrintPreview";
import { ResidentFormModal } from "@/components/leases/ResidentFormModal";
import { whatsappNumber } from "@/components/payments/PrintFrame";
import { useT } from "@/i18n/provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { PaymentRecord } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatMoney } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";

function Stat({ label, value, danger }: { label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div style={{ flex: "1 1 150px", padding: "10px 14px", background: "#fff", border: "1px solid #eef0f0", borderRadius: 10 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
      <div style={{ fontWeight: 600, fontSize: 18, color: danger ? "#cf1322" : undefined }}>{value}</div>
    </div>
  );
}

export default function ResidentPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useTenant();
  const { t } = useT();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManageResidents, canManageLeases, canReadPayments } = usePortfolioPermissions();
  const [editOpen, setEditOpen] = useState(false);
  const resident = useQuery({ queryKey: ["resident", id], queryFn: () => api.resident(id) });
  const payments = useQuery({
    queryKey: ["payments", "resident", id], queryFn: () => api.payments({ residentId: id, size: 100 }), enabled: canReadPayments,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["resident", id] });
    queryClient.invalidateQueries({ queryKey: ["residents"] });
  };
  const archive = useMutation({
    mutationFn: () => (resident.data?.archivedAt ? api.restoreResident(id) : api.archiveResident(id)),
    onSuccess: (r) => {
      message.success(t(r.archivedAt ? "residents.archivedMsg" : "residents.restoredMsg", { name: r.fullName }));
      refresh();
    },
    onError: (error) => message.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => api.deleteResident(id),
    onSuccess: () => {
      message.success(t("residents.deleted"));
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      router.push("/residents");
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (resident.isPending) {
    return <Card><Skeleton active avatar /></Card>;
  }
  if (resident.error) {
    return isApiError(resident.error, "NOT_FOUND")
      ? <Result status="404" title={t("residents.notFound")} extra={<Link href="/residents"><Button>{t("residents.allResidents")}</Button></Link>} />
      : <Alert type="error" showIcon title={errorMessage(resident.error)} />;
  }
  const r = resident.data;
  const open = r.leases.filter((l) => l.status === "ACTIVE" || l.status === "UPCOMING");
  const past = r.leases.filter((l) => l.status === "ENDED" || l.status === "CANCELLED");
  const owed = r.leases.reduce((sum, l) => sum + (l.status === "CANCELLED" ? 0 : l.account.owed), 0);
  const paid = (payments.data?.content ?? []).filter((p) => !p.reversed).reduce((sum, p) => sum + p.amount, 0);
  const since = r.leases.length ? r.leases.map((l) => l.startDate).sort()[0] : r.createdAt;
  const household = open.flatMap((l) => l.occupants);
  const wa = whatsappNumber(r.phone);

  const menu: MenuProps["items"] = canManageResidents ? [
    r.archivedAt
      ? { key: "restore", icon: <UndoOutlined />, label: t("residents.restore"), onClick: () => archive.mutate() }
      : {
        key: "archive", icon: <InboxOutlined />, label: t("residents.archive"), disabled: open.length > 0,
        onClick: () => modal.confirm({
          title: t("residents.archiveTitle", { name: r.fullName }), content: t("residents.archiveText"),
          okText: t("residents.archive"), onOk: () => archive.mutateAsync(),
        }),
      },
    ...(r.leases.length === 0 ? [{
      key: "delete", icon: <DeleteOutlined />, danger: true, label: t("common.delete"),
      onClick: () => modal.confirm({
        title: t("residents.deleteTitle", { name: r.fullName }), content: t("residents.deleteText"),
        okText: t("common.delete"), okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(),
      }),
    }] : []),
  ] : [];

  const paymentColumns = [
    { title: t("receipts.date"), key: "date", render: (_: unknown, p: PaymentRecord) => formatDate(p.paidOn) },
    {
      title: t("receipts.receipt"), key: "receipt",
      render: (_: unknown, p: PaymentRecord) => (
        <PrintLink href={`/print/receipt/${p.id}`}><FileTextOutlined /> {p.receiptNumber}</PrintLink>
      ),
    },
    {
      title: t("leases.apartment"), key: "unit",
      render: (_: unknown, p: PaymentRecord) => `${p.unitNumber}${p.roomName ? ` · ${p.roomName}` : ""}`,
    },
    { title: t("payments.method"), key: "method", render: (_: unknown, p: PaymentRecord) => t(`paymentMethod.${p.method}`) },
    {
      title: t("payments.amount"), key: "amount", align: "right" as const,
      render: (_: unknown, p: PaymentRecord) => (
        <Space size={4}>
          {p.reversed && <Tag color="red">{t("payments.reversed")}</Tag>}
          <Typography.Text strong delete={p.reversed}>{formatMoney(p.amount)}</Typography.Text>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Link href="/residents"><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0, marginBottom: 8 }}>{t("residents.title")}</Button></Link>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Flex gap={14} align="center">
          <Avatar size={56} style={{ background: "#0f766e", fontSize: 22, flexShrink: 0 }}>{r.fullName.charAt(0).toUpperCase()}</Avatar>
          <div>
            <Space align="center" wrap>
              <Typography.Title level={3} style={{ margin: 0 }}>{r.fullName}</Typography.Title>
              {r.archivedAt && <Tag>{t("residents.archived")}</Tag>}
            </Space>
            <Flex gap={14} wrap style={{ fontSize: 14, marginTop: 2 }}>
              <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}><PhoneOutlined /> {r.phone}</a>
              {r.idNumber && <Typography.Text type="secondary">{t(`idType.${r.idType ?? "OTHER"}`)} <Sensitive>{r.idNumber}</Sensitive></Typography.Text>}
            </Flex>
          </div>
        </Flex>
        <Space wrap>
          <a href={`https://wa.me/${wa ?? ""}`} target="_blank" rel="noreferrer">
            <Button icon={<WhatsAppOutlined />} style={{ color: "#128c4b", borderColor: "#128c4b" }}>{t("residents.whatsapp")}</Button>
          </a>
          {canManageResidents && !r.archivedAt && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
          {menu.length > 0 && (
            <Dropdown menu={{ items: menu }} trigger={["click"]}>
              <Button icon={<MoreOutlined />} aria-label={t("common.actions")} />
            </Dropdown>
          )}
        </Space>
      </Flex>

      <Flex gap={10} wrap style={{ marginBottom: 16 }}>
        {canReadPayments && <Stat label={t("residents.owedNow")} value={formatMoney(owed)} danger={owed > 0} />}
        {canReadPayments && <Stat label={t("residents.paidTotal")} value={formatMoney(paid)} />}
        <Stat label={t("residents.openLeases")} value={open.length} />
        <Stat label={t("residents.residentSince")} value={formatDate(since)} />
      </Flex>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} lg={16}>
          <Card size="small">
            <Tabs items={[
              {
                key: "leases", label: `${t("residents.tabLeases")} (${open.length})`,
                children: open.length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("residents.noCurrentLease")} />
                  : <Flex vertical gap={10}>{open.map((l) => <LeaseCard key={l.id} lease={l} show="place" canManage={canManageLeases} />)}</Flex>,
              },
              ...(canReadPayments ? [{
                key: "payments", label: `${t("residents.tabPayments")} (${payments.data?.totalElements ?? 0})`,
                children: (
                  <ResponsiveTable<PaymentRecord> rowKey="id" size="small" columns={paymentColumns} dataSource={payments.data?.content}
                    loading={payments.isFetching} pagination={false} scroll={{ x: 560 }}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("payments.noPayments")} /> }} />
                ),
              }] : []),
              {
                key: "history", label: `${t("residents.tabHistory")} (${past.length})`,
                children: past.length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("residents.noLeases")} />
                  : <Flex vertical gap={10}>{past.map((l) => <LeaseCard key={l.id} lease={l} show="place" canManage={false} />)}</Flex>,
              },
            ]} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title={t("residents.contact")}>
            <Flex vertical gap={8} style={{ fontSize: 14 }}>
              <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}><PhoneOutlined /> {r.phone}</a>
              {r.altPhone && <a href={`tel:${r.altPhone.replace(/[^+\d]/g, "")}`}><PhoneOutlined /> {r.altPhone}</a>}
              {r.email && <a href={`mailto:${r.email}`}><MailOutlined /> {r.email}</a>}
              {r.idNumber && <Typography.Text>{t(`idType.${r.idType ?? "OTHER"}`)}: <Sensitive>{r.idNumber}</Sensitive></Typography.Text>}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t("common.added")}: {formatDate(r.createdAt)}</Typography.Text>
            </Flex>
            {r.notes && <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, whiteSpace: "pre-line" }}>{r.notes}</Typography.Paragraph>}
          </Card>
          {household.length > 0 && (
            <Card size="small" title={`${t("residents.household")} (${household.length})`} style={{ marginTop: 16 }}>
              <Flex vertical gap={6}>
                {household.map((o, i) => (
                  <Flex key={o.id ?? i} justify="space-between" gap={8}>
                    <Typography.Text>{o.fullName}{o.relationship && <Typography.Text type="secondary"> · {o.relationship}</Typography.Text>}</Typography.Text>
                    {o.phone && <a href={`tel:${o.phone.replace(/[^+\d]/g, "")}`} style={{ fontSize: 13 }}>{o.phone}</a>}
                  </Flex>
                ))}
              </Flex>
            </Card>
          )}
          {canReadPayments && open.some((l) => l.account.paidUntil) && (
            <Card size="small" style={{ marginTop: 16 }}>
              {open.filter((l) => l.status === "ACTIVE").map((l) => (
                <Flex key={l.id} justify="space-between" style={{ fontSize: 13 }}>
                  <span>{l.unit.unitNumber}{l.room ? ` · ${l.room.name}` : ""}</span>
                  <PrintLink href={`/print/statement/${l.id}`}><FileTextOutlined /> {t("receipts.statement")}</PrintLink>
                </Flex>
              ))}
            </Card>
          )}
        </Col>
      </Row>
      <ResidentFormModal open={editOpen} resident={r} onClose={() => setEditOpen(false)} />
    </>
  );
}
