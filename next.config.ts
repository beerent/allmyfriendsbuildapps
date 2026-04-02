import type { NextConfig } from "next";
import { execSync } from "child_process";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_HASH: execSync("git rev-parse --short HEAD").toString().trim(),
  },
};

export default nextConfig;
