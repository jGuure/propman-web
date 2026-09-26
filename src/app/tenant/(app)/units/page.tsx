"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { UnitDrawer } from "@/components/portfolio/UnitDrawer";
import { UnitFormDrawer } from "@/components/portfolio/UnitFormDrawer";
import { UnitsTable } from "@/components/portfolio/UnitsTable";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";

function UnitsPage() {
  const { canManage } = usePortfolioPermissions();
  const [openUnit, setOpenUnit] = useState<string>();
  const [addOpen, setAddOpen] = useState(false);
  return (
    <>
      <PageHeader title="Units" description="Every rentable unit across your properties."
        extra={canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Add unit</Button>} />
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
