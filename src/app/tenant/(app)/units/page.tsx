"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { UnitDrawer } from "@/components/portfolio/UnitDrawer";
import { UnitFormDrawer } from "@/components/portfolio/UnitFormDrawer";
import { UnitsTable } from "@/components/portfolio/UnitsTable";
import { useT } from "@/i18n/provider";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";

function UnitsPage() {
  const { canManage } = usePortfolioPermissions();
  const { t } = useT();
  const [openUnit, setOpenUnit] = useState<string>();
  const [addOpen, setAddOpen] = useState(false);
  return (
    <>
      <PageHeader title={t("apartments.title")} description={t("apartments.subtitle")}
        extra={canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>{t("apartments.add")}</Button>} />
      <UnitsTable onOpenUnit={setOpenUnit} onAddUnit={canManage ? () => setAddOpen(true) : undefined} />
      <UnitDrawer unitId={openUnit} onClose={() => setOpenUnit(undefined)} />
      <UnitFormDrawer open={addOpen} onClose={() => setAddOpen(false)} onSaved={(u) => setOpenUnit(u.id)} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <UnitsPage />
    </Suspense>
  );
}
