import { PlatformProvider } from "@/lib/auth/platform-context";

export const metadata = { title: { default: "Platform admin", template: "%s · Platform admin" } };

/** Everything under admin.<base domain> (rewritten by the proxy). */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <PlatformProvider>{children}</PlatformProvider>;
}
