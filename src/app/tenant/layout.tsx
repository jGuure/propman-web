import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TenantGate } from "@/components/tenant/TenantGate";
import { TenantProvider } from "@/lib/auth/tenant-context";
import { TENANT_HEADER } from "@/lib/host";

/** Everything under a tenant subdomain. The proxy puts the tenant slug in a request header. */
export default async function TenantLayout({ children }: LayoutProps<"/tenant">) {
  const slug = (await headers()).get(TENANT_HEADER);
  if (!slug) {
    notFound();
  }
  return (
    <TenantProvider slug={slug}>
      <TenantGate>{children}</TenantGate>
    </TenantProvider>
  );
}
