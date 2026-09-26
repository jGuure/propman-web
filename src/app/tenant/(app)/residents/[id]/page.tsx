"use client";

import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, InboxOutlined, PhoneOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Descriptions, Empty, Flex, Result, Row, Skeleton, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LeaseCard } from "@/components/leases/LeaseCard";
import { ResidentFormModal } from "@/components/leases/ResidentFormModal";
import { useT } from "@/i18n/provider";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";

export default function ResidentPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useTenant();
  const { t } = useT();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { canManageResidents, canManageLeases } = usePortfolioPermissions();
  const [editOpen, setEditOpen] = useState(false);
  const resident = useQuery({ queryKey: ["resident", id], queryFn: () => api.resident(id) });

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
    return <Card><Skeleton active /></Card>;
  }
  if (resident.error) {
    return isApiError(resident.error, "NOT_FOUND")
      ? <Result status="404" title={t("residents.notFound")} extra={<Link href="/residents"><Button>{t("residents.allResidents")}</Button></Link>} />
      : <Alert type="error" showIcon title={errorMessage(resident.error)} />;
  }
  const r = resident.data;
  const open = r.leases.filter((l) => l.status === "ACTIVE" || l.status === "UPCOMING");
  const past = r.leases.filter((l) => l.status === "ENDED" || l.status === "CANCELLED");

  return (
    <>
      <Link href="/residents"><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0, marginBottom: 8 }}>{t("residents.title")}</Button></Link>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="center" wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>{r.fullName}</Typography.Title>
          {r.archivedAt && <Tag>{t("residents.archived")}</Tag>}
        </Space>
        {canManageResidents && (
          <Space wrap>
            {!r.archivedAt && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>}
            {r.archivedAt ? (
              <Button icon={<UndoOutlined />} loading={archive.isPending} onClick={() => archive.mutate()}>{t("residents.restore")}</Button>
            ) : (
              <Button icon={<InboxOutlined />} disabled={open.length > 0} onClick={() => modal.confirm({
                title: t("residents.archiveTitle", { name: r.fullName }), content: t("residents.archiveText"),
                okText: t("residents.archive"), onOk: () => archive.mutateAsync(),
              })}>{t("residents.archive")}</Button>
            )}
            {r.leases.length === 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={() => modal.confirm({
                title: t("residents.deleteTitle", { name: r.fullName }), content: t("residents.deleteText"),
                okText: t("common.delete"), okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(),
              })}>{t("common.delete")}</Button>
            )}
          </Space>
        )}
      </Flex>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t("residents.phone")}>
                <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}><PhoneOutlined /> {r.phone}</a>
              </Descriptions.Item>
              {r.altPhone && <Descriptions.Item label={t("residents.altPhone")}>
                <a href={`tel:${r.altPhone.replace(/[^+\d]/g, "")}`}>{r.altPhone}</a>
              </Descriptions.Item>}
              {r.email && <Descriptions.Item label={t("residents.email")}><a href={`mailto:${r.email}`}>{r.email}</a></Descriptions.Item>}
              {r.idNumber && <Descriptions.Item label={t(`idType.${r.idType ?? "OTHER"}`)}>{r.idNumber}</Descriptions.Item>}
              <Descriptions.Item label={t("common.added")}>{formatDate(r.createdAt)}</Descriptions.Item>
            </Descriptions>
            {r.notes && <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, whiteSpace: "pre-line" }}>{r.notes}</Typography.Paragraph>}
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card title={t("residents.leases")}>
            {r.leases.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("residents.noLeases")} />}
            <Flex vertical gap={10}>
              {open.map((l) => <LeaseCard key={l.id} lease={l} show="place" canManage={canManageLeases} />)}
            </Flex>
            {past.length > 0 && (
              <>
                <Typography.Text type="secondary" strong style={{ display: "block", margin: "16px 0 8px", fontSize: 13, textTransform: "uppercase" }}>
                  {t("leases.history")}
                </Typography.Text>
                <Flex vertical gap={10}>
                  {past.map((l) => <LeaseCard key={l.id} lease={l} show="place" canManage={false} />)}
                </Flex>
              </>
            )}
          </Card>
        </Col>
      </Row>
      <ResidentFormModal open={editOpen} resident={r} onClose={() => setEditOpen(false)} />
    </>
  );
}
