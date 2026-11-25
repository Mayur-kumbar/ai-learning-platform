/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  distDir: process.env.SMARTLEARN_DEMO === '1' ? '.next-demo' : '.next',
  reactCompiler: true,
  reactStrictMode: true,
};

export default nextConfig;
