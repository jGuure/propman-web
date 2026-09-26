"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

type Value = string | number | boolean | undefined | null;

/**
 * Filters and paging kept in the query string, so refresh, back/forward and shared links keep the view.
 * Changing any key other than `page` resets `page`.
 */
export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();

  const set = useCallback(
    (patch: Record<string, Value>) => {
      const next = new URLSearchParams(window.location.search);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (!("page" in patch)) {
        next.delete("page");
      }
      const query = next.toString();
      router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router],
  );

  return useMemo(() => ({
    get: (key: string) => params.get(key) ?? undefined,
    getNumber: (key: string) => {
      const value = params.get(key);
      return value === null || value === "" || Number.isNaN(Number(value)) ? undefined : Number(value);
    },
    getBoolean: (key: string) => {
      const value = params.get(key);
      return value === "true" ? true : value === "false" ? false : undefined;
    },
    set,
  }), [params, set]);
}
