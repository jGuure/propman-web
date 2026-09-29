import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE } from "@/i18n/core";
import { configScript } from "@/lib/config";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PropManagement", template: "%s · PropManagement" },
  description: "Property management for apartments and flats, by IL Software.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLang(saved) ? saved : DEFAULT_LANG;
  return (
    <html lang={lang} className={inter.variable}>
      <head>
        {/* runtime config (API URL, domains) from the server's env, before any app code runs */}
        <script dangerouslySetInnerHTML={{ __html: configScript() }} />
      </head>
      <body>
        <AntdRegistry>
          <Providers lang={lang}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
