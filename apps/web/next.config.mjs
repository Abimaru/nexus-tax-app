/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite validar producción sin competir con un `next dev` activo en `.next`.
  distDir: process.env.NEXUSTAX_NEXT_DIST_DIR || '.next',
  // Los paquetes del workspace se consumen como TypeScript fuente.
  transpilePackages: [
    '@nexus-tax/aegis-rules',
    '@nexus-tax/domain',
    '@nexus-tax/document-intelligence',
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
