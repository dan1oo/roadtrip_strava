import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Pin Turbopack root when a parent folder has its own package-lock.json. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl"],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
