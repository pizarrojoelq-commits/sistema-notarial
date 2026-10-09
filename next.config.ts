import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agrega esto para permitir el acceso desde la red local:
  allowedDevOrigins: ["192.168.1.102"],
};

export default nextConfig;