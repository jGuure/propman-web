"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import { useState, type ReactNode } from "react";
import { isApiError } from "@/lib/api/errors";
import { theme } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) =>
              failureCount < 2 && (!isApiError(error) || error.status === 0 || error.status >= 500),
          },
        },
      }),
  );
  return (
    <ConfigProvider theme={theme}>
      <App>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </App>
    </ConfigProvider>
  );
}
