"use client";

import { DollarOutlined, EditOutlined, HomeOutlined, LoginOutlined, LogoutOutlined, MoreOutlined, PhoneOutlined, StopOutlined, WalletOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Flex, Typography, type MenuProps } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/provider";
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

  const more: MenuProps["items"] = [
    ...(lease.deposit.status === "PENDING" ? [{
      key: "deposit", icon: <WalletOutlined />, label: t("leases.markDepositReceived"), onClick: () => setDepositOpen(true),
    }] : []),
    ...(show === "resident" ? [{
      key: "resident", label: <Link href={`/residents/${lease.resident.id}`}>{t("leases.viewResident")}</Link>,
    }] : []),
  ];
  const place = `${lease.unit.propertyName} · ${lease.unit.buildingName ? `${lease.unit.buildingName} · ` : ""}${lease.unit.unitNumber}`
    + (lease.room ? ` · ${lease.room.name}` : "");

  return (
    <div style={{ padding: "10px 12px", border: "1px solid #eef0f0", borderRadius: 10, background: "#fff" }}>
      <Flex justify="space-between" align="start" gap={8}>
        <div style={{ minWidth: 0 }}>
          {show === "resident" ? (
            <Link href={`/residents/${lease.resident.id}`}>
              <Typography.Text strong style={{ fontSize: 15 }}>{lease.resident.fullName}</Typography.Text>
            </Link>
          ) : (
            <Link href={`/units/${lease.unit.id}`}>
              <Typography.Text strong><HomeOutlined /> {place}</Typography.Text>
            </Link>
          )}
          {show === "resident" && (
            <div>
              <a href={`tel:${lease.resident.phone.replace(/[^+\d]/g, "")}`} style={{ fontSize: 13 }}>
                <PhoneOutlined /> {lease.resident.phone}
              </a>
            </div>
          )}
        </div>
        <Flex gap={4} wrap justify="end">
          <LeaseStatusTag status={lease.status} />
          {lease.endingSoon && <EndingSoonTag />}
        </Flex>
      </Flex>
      {show === "resident" && lease.room && !hideRoom && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 13 }}>{lease.room.name}</Typography.Text>
      )}
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 4 }}>{period(lease)}</Typography.Text>
      <Flex gap={8} align="center" wrap style={{ marginTop: 6 }}>
        <Typography.Text strong>{formatMoney(lease.monthlyRent)}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>/ {t("common.monthlyRent").toLowerCase()}</Typography.Text>
        {lease.deposit.status !== "NONE" && <DepositTag status={lease.deposit.status} />}
      </Flex>
      {includes && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 4 }}>{includes}</Typography.Text>
      )}
      {canReadPayments && billed && (
        <Flex justify="space-between" align="center" gap={8} wrap style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #eef0f0" }}>
          <AccountLine account={lease.account} />
          <Flex gap={4}>
            {canManagePayments && lease.status !== "CANCELLED" && (
              <Button size="small" type="primary" ghost icon={<DollarOutlined />} onClick={() => setPayOpen(true)}>
                {t("payments.record")}
              </Button>
            )}
            <Button size="small" type="link" onClick={() => setAccountOpen(true)}>{t("collect.viewAccount")}</Button>
          </Flex>
        </Flex>
      )}
      {lease.occupants.length > 0 && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 4 }}>
          {tn("leases.household", lease.occupants.length)}: {lease.occupants
            .map((o) => (o.relationship ? `${o.fullName} (${o.relationship})` : o.fullName)).join(", ")}
        </Typography.Text>
      )}
      {lease.endReason && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 4 }}>{lease.endReason}</Typography.Text>
      )}
      {canManage && open && (
        <Flex gap={6} wrap style={{ marginTop: 10 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>
          {lease.status === "ACTIVE" && (
            <Button size="small" icon={<LogoutOutlined />} onClick={() => setEndMode("end")}>{t("leases.recordMoveOut")}</Button>
          )}
          {lease.status === "UPCOMING" && (
            <>
              <Button size="small" type="primary" icon={<LoginOutlined />} loading={start.isPending} onClick={() => modal.confirm({
                title: t("leases.moveInTitle", { name: lease.resident.fullName }), content: t("leases.moveInText"),
                okText: t("leases.moveInNow"), onOk: () => start.mutateAsync(),
              })}>{t("leases.moveInNow")}</Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => setEndMode("cancel")}>{t("leases.cancelReservation")}</Button>
            </>
          )}
          {more.length > 0 && (
            <Dropdown menu={{ items: more }} trigger={["click"]}>
              <Button size="small" icon={<MoreOutlined />} aria-label={t("common.actions")} />
            </Dropdown>
          )}
        </Flex>
      )}
      {!canManage && show === "resident" && (
        <div style={{ marginTop: 6 }}><Link href={`/residents/${lease.resident.id}`} style={{ fontSize: 13 }}>{t("leases.viewResident")}</Link></div>
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
