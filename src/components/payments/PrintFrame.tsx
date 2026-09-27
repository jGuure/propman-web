"use client";

import { PrinterOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Typography } from "antd";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useT } from "@/i18n/provider";
import { useTenant } from "@/lib/auth/tenant-context";

/** "+252 61 5123456" / "061 5123456" -> "252615123456" for wa.me; null when too short to be a full number. */
export function whatsappNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `252${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[67]/.test(digits)) {
    digits = `252${digits}`;
  }
  return digits.length >= 11 ? digits : null;
}

/** A sheet of paper with the organization's letterhead; the toolbar is not printed. */
export function PrintFrame({ title, number, subtitle, whatsapp, children }: {
  title: string; number?: string; subtitle?: ReactNode; whatsapp?: { phone: string; text: string }; children: ReactNode;
}) {
  const { api } = useTenant();
  const { t } = useT();
  const org = useQuery({ queryKey: ["organization"], queryFn: api.organization });
  const o = org.data;
  const waNumber = whatsapp ? whatsappNumber(whatsapp.phone) : null;
  const waHref = whatsapp ? `https://wa.me/${waNumber ?? ""}?text=${encodeURIComponent(whatsapp.text)}` : undefined;

  return (
    <div className="print-wrap" style={{ padding: "24px 16px" }}>
      <style>{`* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: A4; margin: 12mm 0; }
        @media print {
          .no-print { display: none !important; }
          html, body, .print-bg { background: #fff !important; min-height: 0 !important; }
          .print-wrap { padding: 0 !important; }
          .paper { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 14mm !important; }
          tr { break-inside: avoid; } thead { display: table-header-group; }
        }`}</style>
      <Flex className="no-print" justify="center" gap={8} wrap style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>{t("receipts.print")}</Button>
        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer">
            <Button icon={<WhatsAppOutlined />} style={{ color: "#128c4b", borderColor: "#128c4b" }}>{t("receipts.whatsapp")}</Button>
          </a>
        )}
      </Flex>
      <div className="paper" style={{
        // an A4 sheet at real size, so the screen shows exactly what prints (same width and side margins)
        width: "210mm", maxWidth: "100%", boxSizing: "border-box", margin: "0 auto", background: "#fff",
        padding: "12mm 14mm", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,.12)",
      }}>
        <Flex justify="space-between" align="start" gap={16} style={{ borderBottom: "2px solid #0f766e", paddingBottom: 16, marginBottom: 20 }}>
          <Flex gap={12} align="center">
            {o && <BrandLogo name={o.name} logoUrl={o.logoUrl} size={52} />}
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{o?.name}</Typography.Title>
              {o?.legalName && o.legalName !== o.name && <div style={{ fontSize: 12, color: "#555" }}>{o.legalName}</div>}
              <div style={{ fontSize: 12, color: "#555" }}>
                {[o?.address, o?.city].filter(Boolean).join(", ")}
                {(o?.phone || o?.email) && <div>{[o?.phone, o?.email].filter(Boolean).join(" · ")}</div>}
              </div>
            </div>
          </Flex>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
            {number && <div style={{ fontSize: 13, color: "#555" }}>{t("receipts.receiptNo", { number })}</div>}
            {subtitle && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{subtitle}</div>}
          </div>
        </Flex>
        {children}
      </div>
    </div>
  );
}
