/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes del workspace se consumen como TypeScript fuente.
  transpilePackages: [
    '@nexus-tax/aegis-rules',
    '@nexus-tax/domain',
    '@nexus-tax/exogenous-parser',
    '@nexus-tax/ui',
    '@nexus-tax/config',
  ],
  experimental: {
    // Permite importar workers y paquetes del monorepo sin sorpresas de resolución.
    externalDir: true,
  },
};

export default nextConfig;
