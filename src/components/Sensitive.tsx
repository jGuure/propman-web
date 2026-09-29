"use client";

import { EyeInvisibleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useT } from "@/i18n/provider";

const SHOW_FOR_MS = 20_000;

/**
 * Identity document numbers (national ID, passport) shown blurred, so they cannot be read over someone's shoulder or
 * in a shared screen. A tap reveals the value for 20 seconds. Phones and emails stay readable: they are used to call
 * and message residents all day.
 */
export function Sensitive({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reveal = (event: MouseEvent) => {
    if (shown) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), SHOW_FOR_MS);
  };

  return (
    <Tooltip title={shown ? undefined : t("common.tapToShow")}>
      <span onClickCapture={reveal} style={{ cursor: shown ? undefined : "pointer", whiteSpace: "nowrap" }}>
        <span aria-hidden={!shown} style={{
          filter: shown ? "none" : "blur(5px)", userSelect: shown ? "auto" : "none", transition: "filter .15s",
        }}>
          {children}
        </span>
        {!shown && <EyeInvisibleOutlined style={{ marginLeft: 6, fontSize: 12, opacity: 0.55 }} aria-label={t("common.tapToShow")} />}
      </span>
    </Tooltip>
  );
}
