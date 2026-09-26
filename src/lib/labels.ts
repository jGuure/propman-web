"use client";

import { useMemo } from "react";
import type { AmenityScope, PropertyStatus, PropertyType, RoomType, TenantStatus, UnitStatus, UnitType, UserRole, UserStatus } from "@/lib/api/types";
import { useT, type TKey } from "@/i18n/provider";
import type { Vars } from "@/i18n/core";

/** Tag colors and tile colors of unit statuses (explorer, tags, dashboard). */
export const UNIT_STATUS_COLORS: Record<UnitStatus, { tag: string; fill: string; border: string; text: string }> = {
  VACANT: { tag: "green", fill: "#f0fdf4", border: "#86efac", text: "#166534" },
  RESERVED: { tag: "gold", fill: "#fefce8", border: "#fde047", text: "#854d0e" },
  OCCUPIED: { tag: "blue", fill: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
  MAINTENANCE: { tag: "orange", fill: "#fff7ed", border: "#fdba74", text: "#9a3412" },
  INACTIVE: { tag: "default", fill: "#f4f4f5", border: "#d4d4d8", text: "#52525b" },
};

export const UNIT_STATUS_BAR: Record<UnitStatus, string> = {
  VACANT: "#22c55e",
  RESERVED: "#eab308",
  OCCUPIED: "#3b82f6",
  MAINTENANCE: "#f97316",
  INACTIVE: "#a1a1aa",
};

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  ACTIVE: "green",
  INACTIVE: "orange",
  ARCHIVED: "default",
};

export const UNIT_STATUSES: UnitStatus[] = ["VACANT", "RESERVED", "OCCUPIED", "MAINTENANCE", "INACTIVE"];
export const UNIT_TYPES: UnitType[] = ["STUDIO", "ONE_BEDROOM", "TWO_BEDROOM", "THREE_BEDROOM", "FOUR_PLUS_BEDROOM",
  "SHOP", "OFFICE", "WAREHOUSE", "OTHER"];
export const PROPERTY_TYPES: PropertyType[] = ["RESIDENTIAL", "COMMERCIAL", "MIXED"];
export const PROPERTY_STATUSES: PropertyStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];
export const ROOM_TYPES: RoomType[] = ["BEDROOM", "MASTER_BEDROOM", "LIVING_ROOM", "DINING_ROOM", "KITCHEN", "BATHROOM",
  "TOILET", "STORE", "BALCONY", "OFFICE", "OTHER"];
export const AMENITY_SCOPES: AmenityScope[] = ["UNIT", "PROPERTY", "BOTH"];
export const USER_ROLES: UserRole[] = ["OWNER", "MANAGER", "ACCOUNTANT", "STAFF"];
export const USER_STATUSES: UserStatus[] = ["ACTIVE", "INVITED", "DISABLED"];

export const SOMALI_CITIES = [
  "Mogadishu", "Hargeisa", "Garowe", "Kismayo", "Baidoa", "Bosaso", "Beledweyne", "Galkayo", "Berbera", "Burao",
  "Jowhar", "Marka",
];

/** "Ground" / "Floor 3" / "Basement 1" with any translate function. */
export function floorText(t: (key: TKey, vars?: Vars) => string, floor: number): string {
  if (floor === 0) {
    return t("floor.ground");
  }
  return floor < 0 ? t("floor.basement", { n: -floor }) : t("floor.floor", { n: floor });
}

/** Translated names of statuses, types, roles and floors in the current language. */
export function useLabels() {
  const { t } = useT();
  return useMemo(() => ({
    unitStatus: (s: UnitStatus) => t(`unitStatus.${s}`),
    unitType: (s: UnitType) => t(`unitType.${s}`),
    propertyType: (s: PropertyType) => t(`propertyType.${s}`),
    propertyStatus: (s: PropertyStatus) => t(`propertyStatus.${s}`),
    roomType: (s: RoomType) => t(`roomType.${s}`),
    amenityScope: (s: AmenityScope) => t(`amenityScope.${s}`),
    role: (s: UserRole) => t(`roles.${s}`),
    roleHelp: (s: UserRole) => t(`roleHelp.${s}`),
    userStatus: (s: UserStatus) => t(`userStatus.${s}`),
    tenantStatus: (s: TenantStatus) => s.charAt(0) + s.slice(1).toLowerCase(),
    floor: (n: number) => floorText(t, n),
  }), [t]);
}
