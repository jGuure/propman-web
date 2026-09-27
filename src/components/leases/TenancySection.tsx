"use client";

import { KeyOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Flex, Segmented, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { RentalMode, Room, UnitDetails } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { LeaseCard } from "./LeaseCard";
import { LeaseFormDrawer, type RentTarget } from "./LeaseFormDrawer";

/**
 * Who rents the apartment: its open leases, "Rent out", and the rental mode. Room-by-room apartments list each
 * bedroom with its lease or "Available".
 */
export function TenancySection({ unit }: { unit: UnitDetails }) {
  const { api } = useTenant();
  const { t } = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canManageLeases } = usePortfolioPermissions();
  const [target, setTarget] = useState<RentTarget>();
  const archived = !!unit.archivedAt;
  const editable = canManageLeases && !archived;
  const rentable = unit.status !== "MAINTENANCE" && unit.status !== "INACTIVE";

  const mode = useMutation({
    mutationFn: (m: RentalMode) => api.setRentalMode(unit.id, m),
    onSuccess: (u) => {
      message.success(t("leases.rentalModeChanged", { mode: t(`rentalMode.${u.rentalMode}`).toLowerCase() }));
      invalidatePortfolio(queryClient);
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const rentOut = (room?: Room, earliestStart?: string | null) => setTarget({
    unitId: unit.id, unitNumber: unit.unitNumber, room: room ? { id: room.id, name: room.name } : null,
    suggestedRent: room ? null : unit.baseRent, suggestedDeposit: room ? null : unit.depositAmount,
    earliestStart,
  });
  const locked = unit.openLeases.length > 0;
  const roomNames = (list: Room[]) => list.map((r) => r.name).join(", ");
  const shared = unit.rooms.filter((r) => !r.rentable);
  const wholeIncludes = unit.rooms.length ? t("leases.includes", { rooms: roomNames(unit.rooms) }) : undefined;
  const roomShares = shared.length ? t("leases.shares", { rooms: roomNames(shared) }) : undefined;

  const modeSwitch = editable ? (
    <Tooltip title={locked ? t("leases.rentalModeLocked") : undefined}>
      <Segmented size="small" value={unit.rentalMode} disabled={locked || mode.isPending}
        onChange={(v) => mode.mutate(v as RentalMode)}
        options={[{ value: "WHOLE", label: t("rentalMode.WHOLE") }, { value: "BY_ROOM", label: t("rentalMode.BY_ROOM") }]} />
    </Tooltip>
  ) : (
    <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t(`rentalMode.${unit.rentalMode}`)}</Typography.Text>
  );

  let body;
  if (unit.rentalMode === "WHOLE") {
    const active = unit.openLeases.find((l) => l.status === "ACTIVE");
    const upcoming = unit.openLeases.find((l) => l.status === "UPCOMING");
    // rent out when free; book the next resident only while someone lives there with a planned end
    const canBook = !upcoming && (!active || !!active.endDate);
    const nextStart = active?.endDate ? dayjs(active.endDate).add(1, "day").format("YYYY-MM-DD") : null;
    const lastOpen = active;
    body = (
      <Flex vertical gap={8}>
        {unit.openLeases.map((l) => <LeaseCard key={l.id} lease={l} show="resident" canManage={editable} includes={wholeIncludes} />)}
        {editable && canBook && (
          rentable ? (
            <Button type={active ? "default" : "primary"} block icon={active ? <PlusOutlined /> : <KeyOutlined />}
              onClick={() => rentOut(undefined, nextStart)}>
              {lastOpen ? t("leases.bookNext") : t("leases.rentOut")}
            </Button>
          ) : !lastOpen && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("leases.notRentable")}</Typography.Text>
        )}
      </Flex>
    );
  } else {
    const bedrooms = unit.rooms.filter((r) => r.rentable);
    body = bedrooms.length === 0 ? (
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("leases.noBedrooms")}</Typography.Text>
    ) : (
      <Flex vertical gap={10}>
        {bedrooms.map((room) => {
          const leases = unit.openLeases.filter((l) => l.room?.id === room.id);
          const current = leases.find((l) => l.status === "ACTIVE");
          const booked = leases.some((l) => l.status === "UPCOMING");
          const canBookRoom = !booked && (!current || !!current.endDate);
          const next = current?.endDate ? dayjs(current.endDate).add(1, "day").format("YYYY-MM-DD") : null;
          return (
            <div key={room.id}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                <Typography.Text strong>{room.name}</Typography.Text>
                {leases.length === 0 && <Typography.Text type="success" style={{ fontSize: 13 }}>{t("leases.availableRoom")}</Typography.Text>}
              </Flex>
              <Flex vertical gap={6}>
                {leases.map((l) => <LeaseCard key={l.id} lease={l} show="resident" canManage={editable} hideRoom includes={roomShares} />)}
                {editable && rentable && canBookRoom && (
                  <Button size="small" icon={<KeyOutlined />} onClick={() => rentOut(room, next)}>
                    {current ? t("leases.bookNext") : t("leases.rentOutRoom", { room: room.name })}
                  </Button>
                )}
              </Flex>
            </div>
          );
        })}
      </Flex>
    );
  }

  const takenRooms = new Set(unit.openLeases.map((l) => l.room?.id).filter(Boolean)).size;
  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 10 }}>
        {modeSwitch}
        {unit.rentalMode === "BY_ROOM" && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {t("leases.roomsTaken", { taken: takenRooms, total: unit.rooms.filter((r) => r.rentable).length })}
          </Typography.Text>
        )}
      </Flex>
      {body}
      {target && <LeaseFormDrawer open target={target} onClose={() => setTarget(undefined)} />}
    </div>
  );
}
