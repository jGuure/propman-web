"use client";

import { useQuery } from "@tanstack/react-query";
import type { AmenityScope, UnitStatus } from "@/lib/api/types";
import { useMe, useTenant } from "@/lib/auth/tenant-context";

/** Enumerations and the status transitions of the signed-in user's role (cached for the session). */
export function useEnums() {
  const { api } = useTenant();
  return useQuery({ queryKey: ["enums"], queryFn: api.enums, staleTime: Infinity });
}

export function useAmenities(scope?: AmenityScope) {
  const { api } = useTenant();
  return useQuery({ queryKey: ["amenities", scope ?? "ALL"], queryFn: () => api.amenities(scope) });
}

/** What the signed-in user may do in the portfolio. */
export function usePortfolioPermissions() {
  const { data } = useMe();
  const permissions = data?.permissions ?? [];
  return {
    canManage: permissions.includes("properties:manage"),
    canChangeStatus: permissions.includes("units:status"),
    canManageAmenities: permissions.includes("amenities:manage"),
    organizationCurrency: data?.organization.currency ?? "USD",
  };
}

/** Statuses the current user may move a unit to from {@code from}. */
export function useAllowedTransitions(from: UnitStatus | undefined): UnitStatus[] {
  const { data } = useEnums();
  return from && data ? data.myStatusTransitions[from] ?? [] : [];
}
