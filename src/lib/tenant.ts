import { prisma } from "@/lib/prisma";

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug, isActive: true },
    include: {
      venues: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getPublicTenants() {
  return prisma.tenant.findMany({
    where: { isActive: true, visibility: "PUBLIC" },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      description: true,
      logoUrl: true,
      visibility: true,
      _count: { select: { venues: true } },
    },
  });
}

export async function getPublishedActivities(tenantId: string) {
  const now = new Date();
  return prisma.activity.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
      startAt: { gte: now },
    },
    include: {
      venue: true,
      court: true,
      bookings: {
        where: { status: "CONFIRMED" },
        select: { id: true, partySize: true },
      },
    },
    orderBy: { startAt: "asc" },
    take: 50,
  });
}
