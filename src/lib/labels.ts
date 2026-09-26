import type { AmenityScope, PropertyStatus, PropertyType, UnitStatus, UnitType } from "@/lib/api/types";

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  STUDIO: "Studio",
  ONE_BEDROOM: "1 bedroom",
  TWO_BEDROOM: "2 bedrooms",
  THREE_BEDROOM: "3 bedrooms",
  FOUR_PLUS_BEDROOM: "4+ bedrooms",
  SHOP: "Shop",
  OFFICE: "Office",
  WAREHOUSE: "Warehouse",
  OTHER: "Other",
};

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  VACANT: "Vacant",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
};

/** Tag colors and tile colors of unit statuses (grid, tags, dashboard). */
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

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  MIXED: "Mixed use",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  ACTIVE: "green",
  INACTIVE: "orange",
  ARCHIVED: "default",
};

export const AMENITY_SCOPE_LABELS: Record<AmenityScope, string> = {
  UNIT: "Units",
  PROPERTY: "Properties",
  BOTH: "Properties and units",
};

export const SOMALI_CITIES = [
  "Mogadishu", "Hargeisa", "Garowe", "Kismayo", "Baidoa", "Bosaso", "Beledweyne", "Galkayo", "Berbera", "Burao",
  "Jowhar", "Marka",
];

export function floorLabel(floor: number): string {
  if (floor === 0) {
    return "Ground";
  }
  return floor < 0 ? `Basement ${-floor}` : `Floor ${floor}`;
}
