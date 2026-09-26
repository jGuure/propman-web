"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UnitDetailsView } from "@/components/portfolio/UnitDetailsView";

export default function UnitPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Link href="/units"><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0, marginBottom: 8 }}>Units</Button></Link>
      <UnitDetailsView unitId={id} />
    </>
  );
}
