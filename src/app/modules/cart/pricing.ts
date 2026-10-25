import type { Prisma } from "@prisma/client";
import config from "../../config";
import { AppError } from "../../utils/AppError";
import { round2, toNumber } from "../../utils/money";
import { prisma } from "../../lib/prisma";

export type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  lineTotal: number;
  categoryId: string;
};

export type PriceBreakdown = {
  lines: CartLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  itemCount: number;
  freeShippingRemaining: number;
  freeShippingThreshold: number;
  coupon: {
    code: string;
    description: string;
    type: string;
    value: number;
    valid: boolean;
    message?: string;
  } | null;
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: true,
      product: {
        include: {
          images: { take: 1, orderBy: { position: "asc" } },
          category: { select: { id: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export const includeCartItems = cartInclude;

/** Applies coupon rules and returns a full, display-ready price breakdown. */
export async function priceCart(
  cart: CartWithItems,
  couponCode?: string | null,
): Promise<PriceBreakdown> {
  const lines: CartLine[] = cart.items
    .filter((item) => item.variant.isActive && item.product.status === "ACTIVE")
    .map((item) => {
      const unitPrice = toNumber(item.variant.price ?? item.product.price);
      const compareAtRaw = item.variant.compareAt ?? item.product.compareAt;
      return {
        variantId: item.variantId,
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0]?.url ?? "",
        size: item.variant.size,
        color: item.variant.color,
        sku: item.variant.sku,
        stock: item.variant.stock,
        unitPrice,
        compareAt: compareAtRaw ? toNumber(compareAtRaw) : null,
        quantity: item.quantity,
        lineTotal: round2(unitPrice * item.quantity),
        categoryId: item.product.category.id,
      };
    });

  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  let discountTotal = 0;
  let freeShipping = false;
  let coupon: PriceBreakdown["coupon"] = null;

  if (couponCode) {
    const discount = await prisma.discount.findUnique({
      where: { code: couponCode.toUpperCase() },
      include: { products: { select: { id: true } } },
    });

    if (!discount || !discount.isActive) {
      coupon = {
        code: couponCode.toUpperCase(),
        description: "",
        type: "PERCENT",
        value: 0,
        valid: false,
        message: "This code isn't valid",
      };
    } else if (discount.startsAt > new Date() || (discount.endsAt && discount.endsAt < new Date())) {
      coupon = { ...summarize(discount), valid: false, message: "This code has expired" };
    } else if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      coupon = { ...summarize(discount), valid: false, message: "This code has been fully redeemed" };
    } else if (subtotal < toNumber(discount.minOrder)) {
      coupon = {
        ...summarize(discount),
        valid: false,
        message: `Spend ${toNumber(discount.minOrder).toFixed(0)} to use this code`,
      };
    } else {
      const eligibleIds = new Set(discount.products.map((p) => p.id));
      const eligibleLines = lines.filter((line) => {
        if (discount.scope === "ALL") return true;
        if (discount.scope === "PRODUCT") return eligibleIds.has(line.productId);
        return false; // CATEGORY resolved below
      });

      let base = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);

      if (discount.scope === "CATEGORY" && discount.categoryId) {
        const inCategory = await prisma.product.findMany({
          where: { categoryId: discount.categoryId, id: { in: lines.map((l) => l.productId) } },
          select: { id: true },
        });
        const ids = new Set(inCategory.map((p) => p.id));
        base = lines.filter((l) => ids.has(l.productId)).reduce((sum, l) => sum + l.lineTotal, 0);
      }

      if (discount.type === "PERCENT") {
        discountTotal = round2((base * toNumber(discount.value)) / 100);
      } else if (discount.type === "FIXED") {
        discountTotal = round2(Math.min(base, toNumber(discount.value)));
      } else {
        freeShipping = true;
      }

      coupon = { ...summarize(discount), valid: true };
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountTotal);
  const shippingTotal =
    itemCount === 0 || freeShipping || afterDiscount >= config.commerce.freeShippingThreshold
      ? 0
      : config.commerce.shippingFee;
  const taxTotal = round2(afterDiscount * config.commerce.taxRate);
  const grandTotal = round2(afterDiscount + shippingTotal + taxTotal);

  return {
    lines,
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    currency: cart.currency,
    itemCount,
    freeShippingRemaining: round2(
      Math.max(0, config.commerce.freeShippingThreshold - afterDiscount),
    ),
    freeShippingThreshold: config.commerce.freeShippingThreshold,
    coupon,
  };
}

const summarize = (discount: { code: string; description: string; type: string; value: Prisma.Decimal }) => ({
  code: discount.code,
  description: discount.description,
  type: discount.type,
  value: toNumber(discount.value),
  valid: true,
});

/** Resolves the acting cart: signed-in user cart, or a guest cart by token. */
export async function resolveCart(userId?: string, guestToken?: string, create = false) {
  if (userId) {
    const existing = await prisma.cart.findFirst({
      where: { userId },
      include: includeCartItems,
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return existing;
    if (!create) return null;
    return prisma.cart.create({ data: { userId }, include: includeCartItems });
  }

  if (guestToken) {
    const existing = await prisma.cart.findUnique({
      where: { guestToken },
      include: includeCartItems,
    });
    if (existing) return existing;
    if (!create) return null;
    return prisma.cart.create({ data: { guestToken }, include: includeCartItems });
  }

  if (!create) return null;
  throw new AppError(400, "A guest cart token is required");
}
