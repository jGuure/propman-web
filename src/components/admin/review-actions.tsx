"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Input } from "antd";
import { errorMessage } from "@/lib/api/errors";
import type { TenantDetails, TenantSummary } from "@/lib/api/types";
import { usePlatform } from "@/lib/auth/platform-context";

type Target = Pick<TenantSummary, "id" | "name">;

/** Approve or reject an organization waiting for review, each behind a confirmation. */
export function useReviewActions({ onApproved, onRejected }: {
  onApproved?: (tenant: TenantDetails) => void; onRejected?: () => void;
} = {}) {
  const { api } = usePlatform();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approve(id),
    onSuccess: (tenant) => {
      refresh();
      message.success(`${tenant.name} is approved; the owner got the welcome email`);
      onApproved?.(tenant);
    },
    onError: (error) => message.error(errorMessage(error)),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.reject(id, reason),
    onSuccess: () => {
      refresh();
      message.success("Registration deleted");
      onRejected?.();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const approve = (tenant: Target) => modal.confirm({
    title: `Approve ${tenant.name}?`,
    content: "The organization becomes active and its owner can sign in. They get a welcome email.",
    okText: "Approve",
    onOk: () => approveMutation.mutateAsync(tenant.id),
  });

  const reject = (tenant: Target) => {
    let reason = "";
    modal.confirm({
      title: `Reject and delete ${tenant.name}?`,
      content: (
        <>
          <p>The registration and everything in it are deleted for good. The web address becomes free again.</p>
          <Input.TextArea rows={2} maxLength={255} placeholder="Reason (optional, for the audit log)"
            onChange={(e) => { reason = e.target.value; }} />
        </>
      ),
      okText: "Reject and delete",
      okButtonProps: { danger: true },
      onOk: () => rejectMutation.mutateAsync({ id: tenant.id, reason: reason.trim() || undefined }),
    });
  };

  return { approve, reject, busy: approveMutation.isPending || rejectMutation.isPending };
}
