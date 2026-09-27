import { describe, expect, it } from "vitest";
import type { PropertyStructure, StructureApartment, UnitType } from "@/lib/api/types";
import { bedroomMismatch, layoutSuggestions } from "./room-layouts";

const room = (name: string) => ({
  id: name, name, type: "BEDROOM" as const, sizeSqm: 12, rentable: true, leaseStatus: null, residentName: null,
});
const apt = (id: string, type: UnitType, rooms: string[]): StructureApartment => ({
  id, unitNumber: id, type, status: "VACANT", baseRent: 300, currency: "USD", bedrooms: 2, bathrooms: 1,
  rentalMode: "WHOLE", residentName: null, rentableRooms: rooms.length, takenRooms: 0, rooms: rooms.map(room),
});
const structure = (flats: Record<string, StructureApartment[]>, unassigned: StructureApartment[] = []) => ({
  flats: Object.entries(flats).map(([id, apartments]) => ({ id, floors: [{ floor: 1, apartments }] })),
  unassigned: unassigned.length ? [{ floor: 0, apartments: unassigned }] : [],
}) as unknown as PropertyStructure;

describe("layoutSuggestions", () => {
  it("suggests apartments of the same type that have rooms, same flat first", () => {
    const s = structure({
      A: [apt("A1", "TWO_BEDROOM", ["Big"])],
      B: [apt("B1", "TWO_BEDROOM", []), apt("B2", "TWO_BEDROOM", ["Small"]), apt("B3", "SHOP", ["Shop"])],
    });
    expect(layoutSuggestions(s, "B1", "TWO_BEDROOM", "B").map((a) => a.id)).toEqual(["B2", "A1"]);
  });

  it("offers each distinct layout once and at most three", () => {
    const s = structure({
      A: ["1", "2", "3", "4", "5"].map((n) => apt(`A${n}`, "STUDIO", n === "1" || n === "2" ? ["Room"] : [`Room ${n}`])),
    }, [apt("X", "STUDIO", [])]);
    expect(layoutSuggestions(s, "X", "STUDIO", null).map((a) => a.id)).toEqual(["A1", "A3", "A4"]);
  });
});

describe("bedroomMismatch", () => {
  const rooms = (...types: string[]) => types.map((type) => ({ type: type as "BEDROOM" }));

  it("reports missing bedrooms once rooms are described", () => {
    expect(bedroomMismatch("THREE_BEDROOM", [])).toBeNull();
    expect(bedroomMismatch("THREE_BEDROOM", rooms("LIVING_ROOM", "BATHROOM")))
      .toEqual({ kind: "missing", expected: 3, described: 0 });
    expect(bedroomMismatch("THREE_BEDROOM", rooms("MASTER_BEDROOM", "BEDROOM", "BEDROOM", "KITCHEN"))).toBeNull();
  });

  it("reports extra bedrooms except for 4+ and non-residential types", () => {
    expect(bedroomMismatch("STUDIO", rooms("BEDROOM"))).toEqual({ kind: "extra", expected: 0, described: 1 });
    expect(bedroomMismatch("FOUR_PLUS_BEDROOM", rooms("BEDROOM", "BEDROOM", "BEDROOM", "BEDROOM", "BEDROOM"))).toBeNull();
    expect(bedroomMismatch("SHOP", rooms("OTHER"))).toBeNull();
  });
});
