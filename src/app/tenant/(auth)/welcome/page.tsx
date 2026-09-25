"use client";

import { Button, Flex, Result } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useTenant } from "@/lib/auth/tenant-context";

/**
 * Landing page after registration on the root domain. The root site cannot store a session for this subdomain,
 * so it passes the new refresh token in the URL fragment (never sent to any server). It is exchanged at once;
 * rotation makes the token in the URL useless afterwards.
 */
export default function WelcomePage() {
  const { api, signIn } = useTenant();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      router.replace("/login");
      return;
    }
    api.refreshWith(token)
      .then((auth) => {
        signIn(auth);
        router.replace("/dashboard?welcome=1");
      })
      .catch(() => setFailed(true));
  }, [api, signIn, router]);

  if (!failed) {
    return <FullPageSpinner />;
  }
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      <Result status="success" title="Your organization is ready"
        subTitle="Sign in with the email and password you just registered."
        extra={<Link href="/login"><Button type="primary">Sign in</Button></Link>} />
    </Flex>
  );
}
