import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow development connections from the local IP address for testing on mobile
  allowedDevOrigins: ["192.168.31.98", "localhost:3000", "127.0.0.1:3000"],
  
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://127.0.0.1:3001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
