import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite uses native bindings that must not be bundled by webpack
  serverExternalPackages: ["@electric-sql/pglite"],
  // Fix Turbopack workspace root detection when multiple lockfiles exist in parent dirs
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
