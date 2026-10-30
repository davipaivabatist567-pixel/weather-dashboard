import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site 100% estático: `npm run build` gera a pasta `out/`.
  // (Cache Components fica desligado: não é compatível com a exportação estática.)
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
