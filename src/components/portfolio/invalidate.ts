import type { QueryClient } from "@tanstack/react-query";

/** Refreshes every portfolio view after a change (lists, details, grid, dashboard). */
export function invalidatePortfolio(queryClient: QueryClient): void {
  for (const key of ["properties", "property", "buildings", "units", "unit", "unit-grid", "unit-history", "dashboard", "structure", "rooms",
    "residents", "resident", "leases", "lease"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}
