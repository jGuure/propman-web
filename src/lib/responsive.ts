"use client";

import { Grid } from "antd";

/**
 * True on phones (below antd's `md` breakpoint, 768px). False until the screen size is known, so the first render
 * matches the desktop layout the server sent and there is no flash of the wrong layout on desktops.
 */
export function useIsMobile(): boolean {
  return Grid.useBreakpoint().md === false;
}
