import type { PropertyStructure, RoomType, StructureApartment, UnitType } from "@/lib/api/types";

/**
 * Apartments whose room layout an empty apartment can reuse: same type, same flat first,
 * one per distinct layout, at most three.
 */
export function layoutSuggestions(structure: PropertyStructure, unitId: string, type: UnitType, flatId: string | null): StructureApartment[] {
  const all = [
    ...structure.flats.flatMap((f) => f.floors.flatMap((fl) => fl.apartments.map((a) => ({ a, flat: f.id as string | null })))),
    ...structure.unassigned.flatMap((fl) => fl.apartments.map((a) => ({ a, flat: null as string | null }))),
  ].filter(({ a }) => a.id !== unitId && a.type === type && a.rooms.length > 0)
    .sort((x, y) => Number(y.flat === flatId) - Number(x.flat === flatId));
  const seen = new Set<string>();
  return all.map(({ a }) => a).filter((a) => {
    const layout = a.rooms.map((r) => `${r.type}:${r.name}:${r.sizeSqm ?? ""}`).join("|");
    if (seen.has(layout)) {
      return false;
    }
    seen.add(layout);
    return true;
  }).slice(0, 3);
}

const EXPECTED_BEDROOMS: Partial<Record<UnitType, number>> = {
  STUDIO: 0, ONE_BEDROOM: 1, TWO_BEDROOM: 2, THREE_BEDROOM: 3, FOUR_PLUS_BEDROOM: 4,
};

export interface BedroomMismatch {
  kind: "missing" | "extra";
  expected: number;
  described: number;
}

/**
 * Whether the described rooms disagree with the apartment type ("3 bedrooms" but no bedroom described). Only
 * checked once rooms are described; shops, offices and other types have no expected bedrooms.
 */
export function bedroomMismatch(type: UnitType, rooms: { type: RoomType }[]): BedroomMismatch | null {
  const expected = EXPECTED_BEDROOMS[type];
  if (expected === undefined || rooms.length === 0) {
    return null;
  }
  const described = rooms.filter((r) => r.type === "BEDROOM" || r.type === "MASTER_BEDROOM").length;
  if (described < expected) {
    return { kind: "missing", expected, described };
  }
  // "4+ bedrooms" has no upper limit
  if (described > expected && type !== "FOUR_PLUS_BEDROOM") {
    return { kind: "extra", expected, described };
  }
  return null;
}
