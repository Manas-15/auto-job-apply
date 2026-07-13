import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for a lean Docker image.
  output: 'standalone',
  // Trace workspace deps from the monorepo root so standalone includes them.
  outputFileTracingRoot: root,
};

export default nextConfig;
