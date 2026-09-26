"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UnitDetailsView } from "@/components/portfolio/UnitDetailsView";
import { useT } from "@/i18n/provider";

export default function UnitPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
  return (
    <>
      <Link href="/units"><Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0, marginBottom: 8 }}>{t("apartments.backToList")}</Button></Link>
      <UnitDetailsView unitId={id} />
    </>
  );
}
