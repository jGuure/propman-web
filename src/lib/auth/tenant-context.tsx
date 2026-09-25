"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ApiClient } from "@/lib/api/client";
import { tenantApi, type TenantApi } from "@/lib/api/tenant-api";
import type { Me, Permission, TokenPair } from "@/lib/api/types";
import { tenantSessionStore } from "./session-store";

const subscribeNothing = () => () => undefined;

interface TenantContextValue {
  slug: string;
  api: TenantApi;
  /** False until the stored session has been read on the client (during SSR and hydration). */
  ready: boolean;
  isAuthenticated: boolean;
  signIn: (tokens: TokenPair) => void;
  signOut: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const api = useMemo(
    () =>
      tenantApi(
        new ApiClient({
          tenantSlug: slug,
          sessions: tenantSessionStore,
          refreshPath: "/auth/refresh",
          onSessionExpired: () => {
            queryClient.clear();
            router.replace("/login?expired=1");
          },
        }),
      ),
    [slug, queryClient, router],
  );
  const snapshot = useSyncExternalStore(
    tenantSessionStore.subscribe,
    () => tenantSessionStore.snapshot(),
    () => null,
  );
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const signIn = useCallback(
    (tokens: TokenPair) => {
      queryClient.removeQueries({ queryKey: ["me"] });
      tenantSessionStore.set(tokens);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    const session = tenantSessionStore.get();
    if (session) {
      await api.logout(session.refreshToken).catch(() => undefined);
    }
    tenantSessionStore.clear();
    queryClient.clear();
    router.replace("/login");
  }, [api, queryClient, router]);

  const value = useMemo(
    () => ({ slug, api, ready, isAuthenticated: snapshot !== null, signIn, signOut }),
    [slug, api, ready, snapshot, signIn, signOut],
  );
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (!value) {
    throw new Error("useTenant must be used inside <TenantProvider>");
  }
  return value;
}

/** The signed-in user, their organization and permissions. */
export function useMe() {
  const { api, isAuthenticated } = useTenant();
  return useQuery<Me>({ queryKey: ["me"], queryFn: api.me, enabled: isAuthenticated });
}

export function useCan(permission: Permission): boolean {
  const { data } = useMe();
  return data?.permissions.includes(permission) ?? false;
}
