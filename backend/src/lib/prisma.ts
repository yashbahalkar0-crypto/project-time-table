import { PrismaClient } from '@prisma/client';

// Append connection pool limits for PostgreSQL databases (e.g. Render free tier pgbouncer pool_size=15)
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('postgres')) return url;

  const separator = url.includes('?') ? '&' : '?';
  // Keep Prisma pool small to stay under pgbouncer session-mode limit.
  // Interactive $transactions use 2 connections each, so with connection_limit=3
  // we allow at most ~1-2 concurrent transactions without exceeding the pool.
  // pgbouncer=true disables prepared statements (required for PgBouncer compatibility).
  return `${url}${separator}connection_limit=3&pool_timeout=30&pgbouncer=true`;
}

// Singleton pattern — prevents leaking connections during hot-reload in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Cache the datasource URL to avoid computing it twice
const datasourceUrl = getDatasourceUrl();

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: datasourceUrl
      ? { db: { url: datasourceUrl } }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown — release connections back to PgBouncer
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Disconnecting Prisma…`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default prisma;
