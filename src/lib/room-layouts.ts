import type { PropertyStructure, StructureApartment, UnitType } from "@/lib/api/types";

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
