/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

function parseDays(arg, fallback) {
  const n = Number(arg);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const days = parseDays(process.argv[2], 90);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const deleted = await prisma.notification.deleteMany({
      where: {
        OR: [
          { deletedAt: { not: null }, createdAt: { lt: cutoff } },
          { readAt: { not: null }, createdAt: { lt: cutoff } },
        ],
      },
    });

    console.log(`Deleted ${deleted.count} notifications older than ${days} days`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

