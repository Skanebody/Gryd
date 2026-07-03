import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @klaim/shared est publié en sources TS (main: src/index.ts) → transpilation par Next.
  transpilePackages: ['@klaim/shared'],
  // Monorepo : le tracing doit partir de la racine du workspace.
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
