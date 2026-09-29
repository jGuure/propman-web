"use client";

import { FileTextOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Drawer, Empty, Flex, Form, Input, Modal, Skeleton, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { openPrintPreview, PrintLink } from "@/components/payments/PrintPreview";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Charge, PaymentRecord } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatMoney } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { AccountLine } from "./AccountLine";
import { PaymentModal } from "./PaymentModal";
import { ChargeStatusTag } from "./tags";

/** Bills and payments of one lease, with "Record payment" and reversing a payment recorded by mistake. */
export function AccountDrawer({ leaseId, residentName, monthlyRent, open, onClose }: {
  leaseId: string; residentName: string; monthlyRent: number; open: boolean; onClose: () => void;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canManagePayments } = usePortfolioPermissions();
  const [payOpen, setPayOpen] = useState(false);
  const [reversing, setReversing] = useState<PaymentRecord>();
  const [reasonForm] = Form.useForm<{ reason: string }>();
  const account = useQuery({ queryKey: ["lease-account", leaseId], queryFn: () => api.leaseAccount(leaseId), enabled: open });

  const reverse = useMutation({
    mutationFn: (v: { reason: string }) => api.reversePayment(reversing!.id, v.reason),
    onSuccess: () => {
      message.success(t("payments.reversedMsg"));
      invalidatePortfolio(queryClient);
      setReversing(undefined);
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const a = account.data;
  return (
    <Drawer open={open} onClose={onClose} size={620} destroyOnHidden title={t("payments.accountOf", { name: residentName })}
      extra={
        <Flex gap={8}>
          <Button icon={<FileTextOutlined />} onClick={() => openPrintPreview(`/print/statement/${leaseId}`)}>{t("receipts.statement")}</Button>
          {canManagePayments && <Button type="primary" onClick={() => setPayOpen(true)}>{t("payments.record")}</Button>}
        </Flex>
      }>
      {account.isPending && <Skeleton active />}
      {account.error && <Alert type="error" showIcon title={errorMessage(account.error)} />}
      {a && (
        <>
          <div style={{ marginBottom: 16 }}><AccountLine account={a.summary} large /></div>
          <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>{t("payments.bills")}</Typography.Text>
          <ResponsiveTable<Charge> rowKey="id" size="small" pagination={false} dataSource={[...a.charges].reverse()}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("payments.noBills")} /> }}
            columns={[
              { title: t("collect.month"), key: "period", render: (_, c) => dayjs(c.period).format("MMMM YYYY") },
              { title: t("collect.dueDate"), key: "due", render: (_, c) => formatDate(c.dueDate) },
              { title: t("collect.amount"), key: "amount", align: "right", render: (_, c) => formatMoney(c.amount) },
              { title: t("collect.paid"), key: "paid", align: "right", render: (_, c) => formatMoney(c.paidAmount) },
              { title: t("collect.status"), key: "status", render: (_, c) => <ChargeStatusTag status={c.status} /> },
            ]} />
          <Typography.Text strong style={{ display: "block", margin: "20px 0 8px" }}>{t("payments.payments")}</Typography.Text>
          {a.payments.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("payments.noPayments")} />}
          <Flex vertical gap={8}>
            {a.payments.map((p) => (
              <Flex key={p.id} justify="space-between" align="center" gap={8}
                style={{ padding: "8px 12px", border: "1px solid #eef0f0", borderRadius: 8, opacity: p.reversed ? 0.6 : 1 }}>
                <div style={{ minWidth: 0 }}>
                  <Typography.Text strong delete={p.reversed}>{formatMoney(p.amount)}</Typography.Text>{" "}
                  <PrintLink href={`/print/receipt/${p.id}`} style={{ fontSize: 12 }}>{p.receiptNumber}</PrintLink>
                  <Tag style={{ marginInlineStart: 6 }}>{t(`paymentMethod.${p.method}`)}</Tag>
                  {p.reversed && <Tag color="red">{t("payments.reversed")}</Tag>}
                  <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                    {formatDate(p.paidOn)}{p.reference ? ` · ${p.reference}` : ""}
                    {p.receivedByName ? ` · ${t("payments.receivedBy", { name: p.receivedByName })}` : ""}
                    {p.reversed && p.reverseReason ? ` · ${p.reverseReason}` : ""}
                  </Typography.Text>
                </div>
                {canManagePayments && !p.reversed && (
                  <Button size="small" type="text" icon={<UndoOutlined />} onClick={() => { reasonForm.resetFields(); setReversing(p); }}>
                    {t("payments.reverse")}
                  </Button>
                )}
              </Flex>
            ))}
          </Flex>
        </>
      )}
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)}
        target={{ leaseId, residentName, monthlyRent, owed: a?.summary.owed }} />
      <Modal open={!!reversing} onCancel={() => setReversing(undefined)} onOk={() => reasonForm.submit()}
        title={reversing && t("payments.reverseTitle", { amount: formatMoney(reversing.amount) })}
        okText={t("payments.reverse")} okButtonProps={{ danger: true }} confirmLoading={reverse.isPending} destroyOnHidden>
        <Typography.Paragraph type="secondary">{t("payments.reverseText")}</Typography.Paragraph>
        <Form form={reasonForm} layout="vertical" requiredMark={false} onFinish={(v) => reverse.mutate(v)}>
          <Form.Item name="reason" label={t("payments.reverseReason")}
            rules={[{ required: true, whitespace: true, message: t("validation.required") }, { max: 255 }]}>
            <Input autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
