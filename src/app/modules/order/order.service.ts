import type { OrderStatus, Prisma } from "@prisma/client";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/nodemailer";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../utils/activity";
import { round2, toNumber } from "../../utils/money";
import { generateOrderNumber } from "../../utils/orderNumber";
import { includeCartItems, priceCart, resolveCart, type CartWithItems } from "../cart/pricing";

export const orderInclude = {
  items: true,
  events: { orderBy: { createdAt: "asc" } },
  payment: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.OrderInclude;

/** Forward-only lifecycle; cancellations are allowed until fulfilment starts. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  TRANSITIONS[from].includes(to) || from === to;

type CheckoutInput = {
  items?: { variantId: string; quantity: number }[];
  fromCart?: boolean;
  guestToken?: string;
  email: string;
  phone?: string;
  shippingAddress: Prisma.InputJsonValue;
  billingAddress?: Prisma.InputJsonValue;
  couponCode?: string | null;
  paymentMethod: "STRIPE" | "COD" | "SANDBOX";
  notes?: string;
  saveAddress?: boolean;
};

/**
 * The server is the single source of truth for money: prices, discounts,
 * shipping and tax are all recalculated here — never read from the client.
 */
async function buildCart(userId: string | undefined, input: CheckoutInput): Promise<CartWithItems> {
  if (input.fromCart || !input.items?.length) {
    const cart = await resolveCart(userId, input.guestToken, false);
    if (!cart || cart.items.length === 0) throw new AppError(400, "Your cart is empty");
    return cart;
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: input.items.map((i) => i.variantId) } },
    include: {
      product: {
        include: {
          images: { take: 1, orderBy: { position: "asc" } },
          category: { select: { id: true } },
        },
      },
    },
  });

  const now = new Date();
  const pseudo: CartWithItems = {
    id: "checkout",
    userId: userId ?? null,
    guestToken: input.guestToken ?? null,
    currency: config.commerce.currency,
    createdAt: now,
    updatedAt: now,
    items: input.items.map((line, index) => {
      const variant = variants.find((v) => v.id === line.variantId);
      if (!variant) throw new AppError(404, "One of the selected options is no longer available");
      return {
        id: `synthetic-${index}`,
        cartId: "checkout",
        productId: variant.productId,
        variantId: variant.id,
        quantity: line.quantity,
        createdAt: now,
        variant,
        product: variant.product,
      };
    }),
  };

  return pseudo;
}

export async function createOrder(userId: string | undefined, input: CheckoutInput) {
  const cart = await buildCart(userId, input);
  const pricing = await priceCart(cart, input.couponCode);

  if (pricing.lines.length === 0) throw new AppError(400, "Your cart is empty");

  // Stock check up front for a friendly message; the transaction re-checks atomically.
  for (const line of pricing.lines) {
    if (line.quantity > line.stock) {
      throw new AppError(
        409,
        line.stock === 0
          ? `${line.name} (${line.size}/${line.color}) just sold out`
          : `Only ${line.stock} left of ${line.name} (${line.size}/${line.color})`,
      );
    }
  }

  const number = generateOrderNumber();
  const discount = pricing.coupon?.valid
    ? await prisma.discount.findUnique({ where: { code: pricing.coupon.code } })
    : null;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        userId: userId ?? null,
        email: input.email.toLowerCase(),
        phone: input.phone ?? "",
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        shippingTotal: pricing.shippingTotal,
        taxTotal: pricing.taxTotal,
        grandTotal: pricing.grandTotal,
        currency: pricing.currency,
        couponCode: pricing.coupon?.code ?? null,
        discountId: discount?.id ?? null,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress ?? input.shippingAddress,
        notes: input.notes ?? "",
        items: {
          create: pricing.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            name: line.name,
            slug: line.slug,
            image: line.image,
            sku: line.sku,
            size: line.size,
            color: line.color,
            unitPrice: line.unitPrice,
            compareAt: line.compareAt,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
          })),
        },
        events: {
          create: { status: "PENDING", note: "Order placed" },
        },
        payment: {
          create: {
            provider: input.paymentMethod,
            status: "PENDING",
            amount: pricing.grandTotal,
            currency: pricing.currency,
          },
        },
      },
      include: orderInclude,
    });

    // Atomic stock decrement — guards against overselling under concurrency.
    for (const line of pricing.lines) {
      const updated = await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count === 0) {
        throw new AppError(409, `${line.name} sold out while you were checking out`);
      }
      await tx.inventoryMovement.create({
        data: {
          productId: line.productId,
          variantId: line.variantId,
          delta: -line.quantity,
          reason: "SALE",
          note: `Order ${number}`,
          actorId: userId ?? null,
        },
      });
      await tx.product.update({
        where: { id: line.productId },
        data: { soldCount: { increment: line.quantity } },
      });
    }

    if (discount) {
      await tx.discount.update({ where: { id: discount.id }, data: { usedCount: { increment: 1 } } });
    }

    // Persist the shipping address to the customer's address book on request.
    if (userId && input.saveAddress) {
      const existing = await tx.address.findFirst({
        where: { userId, line1: (input.shippingAddress as any).line1 },
      });
      if (!existing) {
        const count = await tx.address.count({ where: { userId } });
        await tx.address.create({
          data: {
            userId,
            ...(input.shippingAddress as any),
            line2: (input.shippingAddress as any).line2 ?? null,
            state: (input.shippingAddress as any).state ?? null,
            isDefault: count === 0,
          },
        });
      }
    }

    // Empty the server-side cart once the order is committed to the DB.
    const sourceCart = await tx.cart.findFirst({
      where: userId ? { userId } : { guestToken: input.guestToken ?? "__none__" },
    });
    if (sourceCart) await tx.cartItem.deleteMany({ where: { cartId: sourceCart.id } });

    return created;
  });

  await logActivity("ORDER_PLACED", "Order", order.id, userId, { number, total: pricing.grandTotal });

  await sendEmail(order.email, `Order ${order.number} confirmed — NORVA`, "order-confirmation", {
    name: (input.shippingAddress as any).fullName,
    orderNumber: order.number,
    items: order.items,
    subtotal: pricing.subtotal,
    shipping: pricing.shippingTotal,
    discount: pricing.discountTotal,
    tax: pricing.taxTotal,
    total: pricing.grandTotal,
    address: input.shippingAddress,
  }).catch(() => null);

  return order;
}

export function listMyOrders(userId: string, query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Number(query.limit) || 10);

  return prisma.order
    .findMany({
      where: { userId, ...(query.status ? { status: query.status as OrderStatus } : {}) },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { placedAt: "desc" },
      include: { items: true, payment: true },
    })
    .then(async (items) => ({
      items,
      meta: {
        page,
        limit,
        total: await prisma.order.count({ where: { userId } }),
        totalPages: 1,
      },
    }));
}

export async function listAllOrders(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 20);
  const where: Prisma.OrderWhereInput = {};

  if (query.status) where.status = String(query.status) as OrderStatus;
  if (query.search) {
    const search = String(query.search);
    where.OR = [
      { number: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (query.from || query.to) {
    where.placedAt = {
      ...(query.from ? { gte: new Date(String(query.from)) } : {}),
      ...(query.to ? { lte: new Date(String(query.to)) } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { placedAt: "desc" },
      include: { items: true, payment: true, user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getOrder(id: string, actor?: { id: string; role: string }) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { number: id }] },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found");

  const isOwner = actor && order.userId === actor.id;
  const isStaff = actor && ["ADMIN", "MANAGER", "STAFF"].includes(actor.role);
  if (!isOwner && !isStaff && !actor) {
    // Guests can read an order by number (used by the confirmation page) —
    // the unguessable number acts as the capability.
  } else if (!isOwner && !isStaff) {
    throw new AppError(403, "You don't have access to this order");
  }

  return order;
}

export async function updateStatus(
  orderId: string,
  input: { status: OrderStatus; note?: string; trackingNumber?: string; trackingUrl?: string },
  actorId: string,
) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: { items: true },
  });
  if (!order) throw new AppError(404, "Order not found");

  if (!canTransition(order.status, input.status)) {
    throw new AppError(409, `A ${order.status.toLowerCase()} order can't move to ${input.status.toLowerCase()}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
        ...(input.trackingUrl ? { trackingUrl: input.trackingUrl } : {}),
        ...(input.status === "CONFIRMED" ? { confirmedAt: new Date() } : {}),
        ...(input.status === "SHIPPED" ? { shippedAt: new Date() } : {}),
        ...(input.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(input.status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        ...(input.status === "DELIVERED" ? { paymentStatus: "PAID" as const } : {}),
        events: { create: { status: input.status, note: input.note ?? "", actorId } },
      },
      include: orderInclude,
    });

    // Cancelling returns every unit to stock.
    if (input.status === "CANCELLED") {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId ?? "",
            variantId: item.variantId,
            delta: item.quantity,
            reason: "RETURN",
            note: `Order ${order.number} cancelled`,
            actorId,
          },
        });
      }
    }

    // Delivered orders credit loyalty cashback to the customer's store credit.
    if (input.status === "DELIVERED" && order.userId) {
      const cashback = round2((toNumber(order.grandTotal) * config.commerce.loyaltyCashbackPercent) / 100);
      if (cashback > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { storeCredit: { increment: cashback } },
        });
      }
    }

    return updated;
  });

  await logActivity("ORDER_STATUS_CHANGED", "Order", order.id, actorId, {
    from: order.status,
    to: input.status,
  });

  await sendEmail(result.email, `Order ${result.number}: ${input.status.toLowerCase().replace(/_/g, " ")}`, "order-status", {
    orderNumber: result.number,
    status: input.status,
    note: input.note,
    trackingNumber: result.trackingNumber,
  }).catch(() => null);

  return result;
}

export async function cancelByCustomer(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({ where: { OR: [{ id: orderId }, { number: orderId }] } });
  if (!order) throw new AppError(404, "Order not found");
  if (order.userId !== userId) throw new AppError(403, "You don't have access to this order");
  if (!["PENDING", "CONFIRMED"].includes(order.status)) {
    throw new AppError(409, "This order is already being prepared — contact support to cancel");
  }
  return updateStatus(order.id, { status: "CANCELLED", note: "Cancelled by customer" }, userId);
}
