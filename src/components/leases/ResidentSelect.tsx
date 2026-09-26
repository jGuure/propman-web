"use client";

import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/provider";
import { useTenant } from "@/lib/auth/tenant-context";

/** Searches current residents by name or phone. */
export function ResidentSelect({ value, onChange }: { value?: string; onChange?: (id?: string) => void }) {
  const { api } = useTenant();
  const { t } = useT();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);
  const residents = useQuery({
    queryKey: ["residents", "picker", search],
    queryFn: () => api.residents({ search: search || undefined, size: 20 }),
  });
  return (
    <Select showSearch={{ filterOption: false, onSearch: setInput }} value={value} onChange={onChange} allowClear
      placeholder={t("leases.chooseResident")} loading={residents.isFetching}
      notFoundContent={residents.isFetching ? undefined : t("residents.noMatch")}
      options={(residents.data?.content ?? []).map((r) => ({ value: r.id, label: `${r.fullName} · ${r.phone}` }))} />
  );
}
