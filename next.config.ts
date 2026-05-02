import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "production" && !process.env.VERCEL ? ".next-runtime" : ".next"
};

export default nextConfig;
