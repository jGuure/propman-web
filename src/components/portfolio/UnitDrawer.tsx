"use client";

import { ExportOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import Link from "next/link";
import { UnitDetailsView } from "./UnitDetailsView";

/** Quick look at a unit from lists and the grid. */
export function UnitDrawer({ unitId, onClose }: { unitId?: string; onClose: () => void }) {
  return (
    <Drawer open={!!unitId} onClose={onClose} size={640} title="Apartment" destroyOnHidden
      extra={unitId && <Link href={`/units/${unitId}`}><Button icon={<ExportOutlined />}>Open page</Button></Link>}>
      {unitId && <UnitDetailsView unitId={unitId} compact />}
    </Drawer>
  );
}
