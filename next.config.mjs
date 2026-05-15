/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["mysql2", "drizzle-orm"],
};

export default nextConfig;
