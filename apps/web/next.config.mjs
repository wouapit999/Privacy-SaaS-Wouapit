/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No 'output: standalone' — the frontend deploys to Vercel (native Next.js
  // support), not the Docker image. Standalone also fails on Windows (symlinks).
};

export default nextConfig;
