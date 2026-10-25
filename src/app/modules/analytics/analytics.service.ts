import { prisma } from "../../lib/prisma";
import { cache } from "../../lib/cache";
import { round2, toNumber } from "../../utils/money";

const dayStart = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const rangeFrom = (days: number) => {
  const end = new Date();
  const start = dayStart(new Date(Date.now() - (days - 1) * 86_400_000));
  return { start, end };
};

export async function summary(days = 30) {
  const { start } = rangeFrom(days);
  const previousStart = new Date(start.getTime() - days * 86_400_000);

  const [current, previous, customers, pendingReviews] = await Promise.all([
    prisma.order.aggregate({
      where: { placedAt: { gte: start }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { grandTotal: true },
      _count: { _all: true },
      _avg: { grandTotal: true },
    }),
    prisma.order.aggregate({
      where: {
        placedAt: { gte: previousStart, lt: start },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  const revenue = toNumber(current._sum.grandTotal);
  const previousRevenue = toNumber(previous._sum.grandTotal);
  const orders = current._count._all;
  const previousOrders = previous._count._all;

  return {
    range: { days, from: start.toISOString() },
    revenue,
    previousRevenue,
    revenueChange: previousRevenue ? round2(((revenue - previousRevenue) / previousRevenue) * 100) : null,
    orders,
    previousOrders,
    ordersChange: previousOrders ? round2(((orders - previousOrders) / previousOrders) * 100) : null,
    aov: round2(toNumber(current._avg.grandTotal)),
    customers,
    pendingReviews,
  };
}

export async function revenueSeries(days = 30) {
  const { start } = rangeFrom(days);
  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: start }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    select: { placedAt: true, grandTotal: true },
  });

  const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let i = 0; i < days; i += 1) {
    const date = dayStart(new Date(Date.now() - (days - 1 - i) * 86_400_000));
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, { date: key, revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    const key = order.placedAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenue = round2(bucket.revenue + toNumber(order.grandTotal));
      bucket.orders += 1;
    }
  }

  return [...buckets.values()];
}

export async function topProducts(limit = 8) {
  const items = await prisma.orderItem.groupBy({
    by: ["productId", "name", "slug", "image"],
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });

  return items.map((item) => ({
    productId: item.productId,
    name: item.name,
    slug: item.slug,
    image: item.image,
    units: item._sum.quantity ?? 0,
    revenue: round2(toNumber(item._sum.lineTotal)),
  }));
}

export async function statusBreakdown() {
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { grandTotal: true },
  });
  return grouped.map((row) => ({
    status: row.status,
    count: row._count._all,
    revenue: round2(toNumber(row._sum.grandTotal)),
  }));
}

export async function categoryPerformance() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      price: true,
      soldCount: true,
      category: { select: { name: true, slug: true } },
    },
  });

  const map = new Map<string, { name: string; slug: string; units: number; revenue: number }>();
  for (const product of products) {
    const key = product.category.slug;
    const entry = map.get(key) ?? { name: product.category.name, slug: key, units: 0, revenue: 0 };
    entry.units += product.soldCount;
    entry.revenue = round2(entry.revenue + product.soldCount * toNumber(product.price));
    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export async function topCustomers(limit = 6) {
  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { not: null }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    _sum: { grandTotal: true },
    _count: { _all: true },
    orderBy: { _sum: { grandTotal: "desc" } },
    take: limit,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId!).filter(Boolean) } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  return grouped.map((row) => {
    const user = users.find((u) => u.id === row.userId);
    return {
      id: row.userId,
      name: user?.name ?? "Guest",
      email: user?.email ?? "",
      avatarUrl: user?.avatarUrl ?? "",
      orders: row._count._all,
      spend: round2(toNumber(row._sum.grandTotal)),
    };
  });
}

export async function dashboard(days = 30) {
  return cache.remember(`analytics:dashboard:${days}`, 60, async () => {
    const [kpis, series, top, statuses, categories, customers, lowStock, recentOrders] =
      await Promise.all([
        summary(days),
        revenueSeries(days),
        topProducts(),
        statusBreakdown(),
        categoryPerformance(),
        topCustomers(),
        prisma.productVariant.findMany({
          where: { isActive: true, stock: { lte: 5 }, product: { status: "ACTIVE" } },
          orderBy: { stock: "asc" },
          take: 8,
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            stock: true,
            product: { select: { name: true, slug: true, images: { take: 1 } } },
          },
        }),
        prisma.order.findMany({
          orderBy: { placedAt: "desc" },
          take: 8,
          select: {
            id: true,
            number: true,
            email: true,
            status: true,
            grandTotal: true,
            placedAt: true,
            items: { select: { id: true } },
          },
        }),
      ]);

    return { kpis, series, topProducts: top, statuses, categories, topCustomers: customers, lowStock, recentOrders };
  });
}

export async function customerInsights(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    select: { id: true, grandTotal: true, status: true, placedAt: true },
  });

  const spent = orders
    .filter((o) => !["CANCELLED", "REFUNDED"].includes(o.status))
    .reduce((sum, o) => sum + toNumber(o.grandTotal), 0);

  const wishlist = await prisma.wishlistItem.count({ where: { userId } });

  return {
    orders: orders.length,
    spent: round2(spent),
    wishlist,
    lastOrderAt: orders.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())[0]?.placedAt ?? null,
  };
}
