"use client";

import { BankOutlined, SearchOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { Empty, Flex, Input, Tooltip, Typography } from "antd";
import { useMemo, useState } from "react";
import type { PropertyStructure, StructureApartment, StructureFloor, UnitStatus } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { useT } from "@/i18n/provider";
import { UNIT_STATUS_BAR, UNIT_STATUS_COLORS, useLabels } from "@/lib/labels";
import { useIsMobile } from "@/lib/responsive";
import { brand } from "@/lib/theme";

interface Props {
  structure: PropertyStructure;
  selectedFlatId?: string;
  selectedApartmentId?: string;
  onSelectFlat: (flatId: string) => void;
  onSelectApartment: (apartmentId: string, flatId: string | null) => void;
}

const STATUSES: UnitStatus[] = ["VACANT", "RESERVED", "OCCUPIED", "MAINTENANCE", "INACTIVE"];

/** The flats drawn as buildings: floors stacked from the top floor down, apartments as colored boxes. */
export function BuildingExplorer({ structure, selectedFlatId, selectedApartmentId, onSelectFlat, onSelectApartment }: Props) {
  const mobile = useIsMobile();
  const { t, tn } = useT();
  const labels = useLabels();
  const [highlight, setHighlight] = useState<UnitStatus | undefined>();
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  const counts = useMemo(() => {
    const result: Record<UnitStatus, number> = { VACANT: 0, RESERVED: 0, OCCUPIED: 0, MAINTENANCE: 0, INACTIVE: 0 };
    const all = [...structure.flats.flatMap((f) => f.floors), ...structure.unassigned].flatMap((f) => f.apartments);
    all.forEach((a) => { result[a.status] += 1; });
    return result;
  }, [structure]);

  const dimmed = (a: StructureApartment) =>
    (highlight !== undefined && a.status !== highlight) || (term !== "" && !a.unitNumber.toLowerCase().includes(term));

  if (structure.flats.length === 0 && structure.unassigned.length === 0) {
    return <Empty description={t("explorer.empty")} style={{ padding: "40px 0" }} />;
  }

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Flex wrap gap={6}>
          {STATUSES.map((status) => {
            const active = highlight === status;
            return (
              <button key={status} type="button" onClick={() => setHighlight(active ? undefined : status)}
                title={active ? t("explorer.showAll") : t("explorer.highlight", { status: labels.unitStatus(status).toLowerCase() })}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, cursor: "pointer",
                  fontSize: 13, border: `1px solid ${active ? UNIT_STATUS_BAR[status] : "#e5e7eb"}`,
                  background: active ? UNIT_STATUS_COLORS[status].fill : "#fff", fontWeight: active ? 600 : 400,
                }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: UNIT_STATUS_BAR[status] }} />
                {labels.unitStatus(status)} <span style={{ color: "#6b7280" }}>{counts[status]}</span>
              </button>
            );
          })}
        </Flex>
        <Input allowClear size="small" prefix={<SearchOutlined />} placeholder={t("explorer.findApartment")} style={{ width: 170 }}
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </Flex>

      {/* phones: flats stacked and floors wrapping, so nothing scrolls sideways */}
      <div style={{ overflowX: mobile ? undefined : "auto", paddingBottom: 8 }}>
        <Flex gap={20} vertical={mobile} align={mobile ? "stretch" : "flex-end"} style={{ minWidth: mobile ? undefined : "min-content" }}>
          {structure.flats.map((flat) => {
            const byFloor = new Map(flat.floors.map((f) => [f.floor, f.apartments]));
            const floors: StructureFloor[] = [];
            for (let floor = flat.floorsCount; floor >= -flat.basementFloors; floor--) {
              floors.push({ floor, apartments: byFloor.get(floor) ?? [] });
            }
            const selected = selectedFlatId === flat.id;
            return (
              <Flat key={flat.id} title={flat.name} subtitle={t("explorer.flatSubtitle", { apartments: tn("count.apartments", flat.unitStats.total), percent: Math.round(flat.unitStats.occupancyRate * 100) })}
                lift={flat.hasLift} selected={selected} onSelect={() => onSelectFlat(flat.id)}>
                {floors.map((f) => (
                  <FloorRow key={f.floor} floor={f.floor}>
                    {f.apartments.map((a) => (
                      <ApartmentBox key={a.id} apartment={a} selected={a.id === selectedApartmentId} dimmed={dimmed(a)}
                        onClick={() => onSelectApartment(a.id, flat.id)} />
                    ))}
                  </FloorRow>
                ))}
              </Flat>
            );
          })}
          {structure.unassigned.length > 0 && (
            <Flat title={structure.flats.length ? t("explorer.otherApartments") : structure.name} subtitle={t("explorer.notInFlat")} lift={false}>
              {structure.unassigned.map((f) => (
                <FloorRow key={f.floor} floor={f.floor}>
                  {f.apartments.map((a) => (
                    <ApartmentBox key={a.id} apartment={a} selected={a.id === selectedApartmentId} dimmed={dimmed(a)}
                      onClick={() => onSelectApartment(a.id, null)} />
                  ))}
                </FloorRow>
              ))}
            </Flat>
          )}
        </Flex>
      </div>
    </div>
  );
}

function Flat({ title, subtitle, lift, selected, onSelect, children }: {
  title: string; subtitle: string; lift: boolean; selected?: boolean; onSelect?: () => void; children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div style={{ flexShrink: 0, minWidth: 0 }}>
      <button type="button" onClick={onSelect} disabled={!onSelect}
        style={{
          display: "block", width: "100%", textAlign: "left", cursor: onSelect ? "pointer" : "default",
          padding: "10px 14px", borderRadius: "12px 12px 0 0", border: "none",
          background: selected ? brand.primary : brand.dark, color: "#fff",
        }}>
        <Flex align="center" gap={8}>
          <BankOutlined />
          <span style={{ fontWeight: 600 }}>{title}</span>
          {lift && <Tooltip title={t("explorer.hasLift")}><VerticalAlignTopOutlined style={{ opacity: 0.8 }} /></Tooltip>}
        </Flex>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{subtitle}</div>
      </button>
      <div style={{
        borderStyle: "none solid solid", borderWidth: 2, borderColor: selected ? brand.primary : "#d6dcdc",
        borderRadius: "0 0 6px 6px", background: "#fff", padding: "6px 10px 4px",
      }}>
        {children}
      </div>
      <div style={{ height: 6, margin: "0 -6px", background: "#cfd8d7", borderRadius: 3 }} />
    </div>
  );
}

function FloorRow({ floor, children }: { floor: number; children: React.ReactNode }) {
  const labels = useLabels();
  const mobile = useIsMobile();
  return (
    <Flex align="center" gap={8} style={{
      padding: "4px 0", borderBottom: "1px dashed #eceff0", minHeight: 50,
      background: floor < 0 ? "repeating-linear-gradient(135deg,#fafafa,#fafafa 6px,#f3f4f6 6px,#f3f4f6 12px)" : undefined,
    }}>
      <Typography.Text type="secondary" style={{ width: 54, fontSize: 11, flexShrink: 0 }}>{labels.floor(floor)}</Typography.Text>
      <Flex gap={6} wrap={mobile}>{children}</Flex>
    </Flex>
  );
}

function ApartmentBox({ apartment: a, selected, dimmed, onClick }: {
  apartment: StructureApartment; selected: boolean; dimmed: boolean; onClick: () => void;
}) {
  const { t, tn } = useT();
  const labels = useLabels();
  const colors = UNIT_STATUS_COLORS[a.status];
  return (
    <Tooltip title={<>
      <div><b>{a.unitNumber}</b> · {labels.unitStatus(a.status)}</div>
      <div>{labels.unitType(a.type)} · {formatMoney(a.baseRent)}</div>
      <div>{a.rooms.length ? tn("count.rooms", a.rooms.length) : t("explorer.noRoomsYet")}</div>
      {a.rentalMode === "BY_ROOM" ? (
        <div>{t("rentalMode.BY_ROOM")} · {t("leases.roomsTaken", { taken: a.takenRooms, total: a.rentableRooms })}</div>
      ) : a.residentName && <div>{a.residentName}</div>}
    </>}>
      <button type="button" onClick={onClick} aria-pressed={selected} aria-label={`${t("explorer.apartment", { number: a.unitNumber })}, ${labels.unitStatus(a.status)}`}
        style={{
          position: "relative", width: 58, height: 40, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
          background: colors.fill, color: colors.text, border: `1.5px solid ${selected ? brand.primary : colors.border}`,
          boxShadow: selected ? `0 0 0 3px ${brand.primary}55` : undefined, opacity: dimmed ? 0.25 : 1,
          transition: "opacity .15s, box-shadow .15s",
        }}>
        {a.unitNumber}
        {a.rentalMode === "BY_ROOM" && (
          <span style={{ position: "absolute", bottom: 1, left: 0, right: 0, fontSize: 9, fontWeight: 500, lineHeight: 1 }}>
            {a.takenRooms}/{a.rentableRooms}
          </span>
        )}
        {a.rooms.length === 0 && (
          <span title={t("rooms.none")} style={{ position: "absolute", top: 3, right: 3, width: 6, height: 6, borderRadius: 3, background: "#f59e0b" }} />
        )}
      </button>
    </Tooltip>
  );
}
