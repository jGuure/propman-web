import type { NextConfig } from "next";

// No `output: "standalone"`: the standalone server does not run src/proxy.ts for tenant/admin hosts (they 404),
// so the Docker image runs `next start`. Runtime config comes from env, see src/lib/config.ts.
const nextConfig: NextConfig = {};

export default nextConfig;
