import type { NextConfig } from "next";
const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "odin-platform-user-avatars.s3.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      // Adicionado para os avatares de exemplo que usamos
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
  ],
  },

  serverExternalPackages: ["pdf-parse"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    return config;
  },
};

export default nextConfig;
