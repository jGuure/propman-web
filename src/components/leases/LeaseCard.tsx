"use client";

import { DollarOutlined, EditOutlined, FileTextOutlined, HomeOutlined, LoginOutlined, LogoutOutlined, MoreOutlined, PhoneOutlined, StopOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Flex, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { openPrintPreview } from "@/components/payments/PrintPreview";
import type { Lease } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import { AccountDrawer } from "@/components/payments/AccountDrawer";
import { AccountLine } from "@/components/payments/AccountLine";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { errorMessage } from "@/lib/api/errors";
import { useTenant } from "@/lib/auth/tenant-context";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { DepositReceivedModal } from "./DepositReceivedModal";
import { EndLeaseModal } from "./EndLeaseModal";
import { LeaseFormDrawer } from "./LeaseFormDrawer";
import { DepositTag, EndingSoonTag, LeaseStatusTag } from "./tags";

/** Period text: "From 1 Jun 2026 · until 31 May 2027", "1 Jun 2026 – 30 Sep 2026" for ended leases. */
export function usePeriod() {
  const { t } = useT();
  return (lease: Lease) => {
    if (lease.movedOutOn) {
      return t("leases.fromTo", { from: formatDate(lease.startDate), to: formatDate(lease.movedOutOn) });
    }
    const from = t("leases.from", { date: formatDate(lease.startDate) });
    return lease.endDate ? `${from} · ${t("leases.until", { date: formatDate(lease.endDate) })}` : from;
  };
}

/**
 * One lease with its actions. `show` = "resident" (on an apartment: who rents it) or "place" (on a resident: which
 * apartment).
 */
export function LeaseCard({ lease, show, canManage, hideRoom = false, includes }: {
  lease: Lease; show: "resident" | "place"; canManage: boolean; hideRoom?: boolean;
  /** What the lease covers, e.g. "Includes: Master bedroom, Kitchen…" (shown when known). */
  includes?: string;
}) {
  const { t, tn } = useT();
  const period = usePeriod();
  const [editOpen, setEditOpen] = useState(false);
  const [endMode, setEndMode] = useState<"end" | "cancel">();
  const [depositOpen, setDepositOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { canReadPayments, canManagePayments } = usePortfolioPermissions();
  // upcoming leases have no bills yet, unless someone paid in advance
  const billed = (lease.status === "ACTIVE" || lease.status === "ENDED") || lease.account.credit > 0;
  const open = lease.status === "ACTIVE" || lease.status === "UPCOMING";
  const { api } = useTenant();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: () => api.startLease(lease.id),
    onSuccess: () => {
      message.success(t("leases.movedIn", { name: lease.resident.fullName }));
      invalidatePortfolio(queryClient);
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const canPay = canManagePayments && (lease.status === "ACTIVE" || lease.status === "ENDED");
  const more: MenuProps["items"] = [
    ...(canManage && open ? [{ key: "edit", icon: <EditOutlined />, label: t("common.edit"), onClick: () => setEditOpen(true) }] : []),
    ...(canReadPayments && billed ? [
      { key: "account", icon: <WalletOutlined />, label: t("payments.account"), onClick: () => setAccountOpen(true) },
      {
        key: "statement", icon: <FileTextOutlined />,
        label: t("receipts.statement"), onClick: () => openPrintPreview(`/print/statement/${lease.id}`),
      },
    ] : []),
    ...(canManage && lease.deposit.status === "PENDING" ? [{
      key: "deposit", icon: <WalletOutlined />, label: t("leases.markDepositReceived"), onClick: () => setDepositOpen(true),
    }] : []),
    ...(show === "resident" ? [{
      key: "resident", icon: <UserOutlined />, label: <Link href={`/residents/${lease.resident.id}`}>{t("leases.viewResident")}</Link>,
    }] : []),
  ];
  const place = `${lease.unit.propertyName} · ${lease.unit.buildingName ? `${lease.unit.buildingName} · ` : ""}${lease.unit.unitNumber}`
    + (lease.room ? ` · ${lease.room.name}` : "");
  const details = [
    lease.occupants.length > 0 && `${tn("leases.household", lease.occupants.length)}: ${lease.occupants
      .map((o) => (o.relationship ? `${o.fullName} (${o.relationship})` : o.fullName)).join(", ")}`,
    includes,
    lease.endReason,
  ].filter(Boolean) as string[];
  const hasActions = (canManage && open) || canPay || more.length > 0;

  return (
    <div style={{ padding: "12px 14px", border: "1px solid #eef0f0", borderRadius: 10, background: "#fff" }}>
      <Flex justify="space-between" align="start" gap={8}>
        {show === "resident" ? (
          <Link href={`/residents/${lease.resident.id}`} style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ fontSize: 15 }}>{lease.resident.fullName}</Typography.Text>
          </Link>
        ) : (
          <Link href={`/units/${lease.unit.id}`} style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ fontSize: 15 }}><HomeOutlined /> {place}</Typography.Text>
          </Link>
        )}
        <Flex gap={4} wrap justify="end" style={{ flexShrink: 0 }}>
          {lease.endingSoon && <EndingSoonTag />}
          <LeaseStatusTag status={lease.status} />
        </Flex>
      </Flex>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 2 }}>
        {show === "resident" && (
          <><a href={`tel:${lease.resident.phone.replace(/[^+\d]/g, "")}`}><PhoneOutlined /> {lease.resident.phone}</a> · </>
        )}
        {show === "resident" && lease.room && !hideRoom && <>{lease.room.name} · </>}
        {period(lease)}
      </Typography.Text>
      <Flex gap={8} align="center" wrap style={{ marginTop: 8 }}>
        <Typography.Text strong style={{ fontSize: 15 }}>{formatMoney(lease.monthlyRent)}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>/ {t("common.monthlyRent").toLowerCase()}</Typography.Text>
        {lease.deposit.status !== "NONE" && <DepositTag status={lease.deposit.status} />}
        {canReadPayments && billed && <AccountLine account={lease.account} />}
      </Flex>
      {details.map((d) => (
        <Typography.Text key={d} type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>{d}</Typography.Text>
      ))}
      {hasActions && (
        <Flex gap={6} wrap style={{ marginTop: 10 }}>
          {canManage && lease.status === "UPCOMING" && (
            <>
              <Button size="small" type="primary" icon={<LoginOutlined />} loading={start.isPending} onClick={() => modal.confirm({
                title: t("leases.moveInTitle", { name: lease.resident.fullName }), content: t("leases.moveInText"),
                okText: t("leases.moveInNow"), onOk: () => start.mutateAsync(),
              })}>{t("leases.moveInNow")}</Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => setEndMode("cancel")}>{t("leases.cancelReservation")}</Button>
            </>
          )}
          {canPay && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => setPayOpen(true)}>{t("payments.record")}</Button>
          )}
          {canManage && lease.status === "ACTIVE" && (
            <Button size="small" icon={<LogoutOutlined />} onClick={() => setEndMode("end")}>{t("leases.recordMoveOut")}</Button>
          )}
          {more.length > 0 && (
            <Dropdown menu={{ items: more }} trigger={["click"]}>
              <Button size="small" icon={<MoreOutlined />} aria-label={t("common.actions")} />
            </Dropdown>
          )}
        </Flex>
      )}
      <LeaseFormDrawer open={editOpen} lease={lease} onClose={() => setEditOpen(false)} />
      {endMode && <EndLeaseModal open lease={lease} mode={endMode} onClose={() => setEndMode(undefined)} />}
      {depositOpen && <DepositReceivedModal open lease={lease} onClose={() => setDepositOpen(false)} />}
      {payOpen && (
        <PaymentModal open onClose={() => setPayOpen(false)} target={{
          leaseId: lease.id, residentName: lease.resident.fullName, monthlyRent: lease.monthlyRent, owed: lease.account.owed,
        }} />
      )}
      {accountOpen && (
        <AccountDrawer open leaseId={lease.id} residentName={lease.resident.fullName} monthlyRent={lease.monthlyRent}
          onClose={() => setAccountOpen(false)} />
      )}
    </div>
  );
}
