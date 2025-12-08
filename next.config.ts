import type { NextConfig } from "next";

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
        hostname: "odin-plataform-oraculo-system.s3.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "odin-plataform-inovation.s3.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "odin-plataform-jr-points-attachments.s3.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "odin-plataform-oraculo-system.s3.sa-east-1.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "odin-plataform-inovation.s3.sa-east-1.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "odin-plataform-community.s3.amazonaws.com",
        port: "",
        pathname: "/**",
        // Você pode ser mais específico com a porta e o pathname se desejar
      },
      {
        protocol: "https",
        hostname: "odin-plataform-community.s3.sa-east-1.amazonaws.com",
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
};

export default nextConfig;
