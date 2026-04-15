import { PrismaClient } from '@prisma/client';

// Append connection pool limits for PostgreSQL databases (e.g. Render free tier pgbouncer pool_size=15)
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('postgres')) return url;

  const separator = url.includes('?') ? '&' : '?';
  // Keep pool small to stay under pgbouncer session limit
  return `${url}${separator}connection_limit=5&pool_timeout=10`;
}

// Singleton pattern — prevents leaking connections during hot-reload in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: getDatasourceUrl()
      ? { db: { url: getDatasourceUrl() } }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
