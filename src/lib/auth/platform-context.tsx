"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ApiClient } from "@/lib/api/client";
import { platformApi, type PlatformApi } from "@/lib/api/platform-api";
import type { TokenPair } from "@/lib/api/types";
import { platformSessionStore } from "./session-store";

const subscribeNothing = () => () => undefined;

interface PlatformContextValue {
  api: PlatformApi;
  /** False until the stored session has been read on the client (during SSR and hydration). */
  ready: boolean;
  isAuthenticated: boolean;
  signIn: (tokens: TokenPair) => void;
  signOut: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const api = useMemo(
    () =>
      platformApi(
        new ApiClient({
          sessions: platformSessionStore,
          refreshPath: "/platform/auth/refresh",
          onSessionExpired: () => {
            queryClient.clear();
            router.replace("/login?expired=1");
          },
        }),
      ),
    [queryClient, router],
  );
  const snapshot = useSyncExternalStore(
    platformSessionStore.subscribe,
    () => platformSessionStore.snapshot(),
    () => null,
  );
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const signIn = useCallback(
    (tokens: TokenPair) => {
      queryClient.removeQueries({ queryKey: ["platform-me"] });
      platformSessionStore.set(tokens);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    const session = platformSessionStore.get();
    if (session) {
      await api.logout(session.refreshToken).catch(() => undefined);
    }
    platformSessionStore.clear();
    queryClient.clear();
    router.replace("/login");
  }, [api, queryClient, router]);

  const value = useMemo(
    () => ({ api, ready, isAuthenticated: snapshot !== null, signIn, signOut }),
    [api, ready, snapshot, signIn, signOut],
  );
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const value = useContext(PlatformContext);
  if (!value) {
    throw new Error("usePlatform must be used inside <PlatformProvider>");
  }
  return value;
}

export function usePlatformMe() {
  const { api, isAuthenticated } = usePlatform();
  return useQuery({ queryKey: ["platform-me"], queryFn: api.me, enabled: isAuthenticated });
}
