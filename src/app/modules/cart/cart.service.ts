import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { includeCartItems, priceCart, resolveCart } from "./pricing";

const guestTokenFor = (body: any, query: any) =>
  (body?.guestToken ?? query?.guestToken) as string | undefined;

export async function getCart(userId?: string, guestToken?: string, coupon?: string) {
  const cart = await resolveCart(userId, guestToken, false);
  if (!cart) {
    return {
      cart: null,
      pricing: await priceCart(
        { id: "", userId: userId ?? null, guestToken: guestToken ?? null, currency: "USD", createdAt: new Date(), updatedAt: new Date(), items: [] },
        coupon,
      ),
    };
  }
  return { cart, pricing: await priceCart(cart, coupon) };
}

export async function addItem(
  userId: string | undefined,
  input: { variantId: string; quantity: number; guestToken?: string },
) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: true },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
    throw new AppError(404, "That option is no longer available");
  }

  const cart = await resolveCart(userId, input.guestToken, true);
  if (!cart) throw new AppError(400, "Could not open a cart");

  const existing = cart.items.find((item) => item.variantId === input.variantId);
  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;

  if (nextQuantity > variant.stock) {
    throw new AppError(
      409,
      variant.stock === 0
        ? "This size and colour just sold out"
        : `Only ${variant.stock} left of this option`,
    );
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: variant.productId, variantId: variant.id, quantity: input.quantity },
    });
  }

  return refresh(cart.id, userId, input.guestToken);
}

export async function updateItem(
  userId: string | undefined,
  variantId: string,
  quantity: number,
  guestToken?: string,
) {
  const cart = await resolveCart(userId, guestToken, false);
  if (!cart) throw new AppError(404, "Cart not found");

  const item = cart.items.find((i) => i.variantId === variantId);
  if (!item) throw new AppError(404, "That item isn't in your cart");

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (quantity > item.variant.stock) {
      throw new AppError(409, `Only ${item.variant.stock} left of this option`);
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }

  return refresh(cart.id, userId, guestToken);
}

export async function removeItem(userId: string | undefined, variantId: string, guestToken?: string) {
  const cart = await resolveCart(userId, guestToken, false);
  if (!cart) throw new AppError(404, "Cart not found");
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  return refresh(cart.id, userId, guestToken);
}

export async function clearCart(userId: string | undefined, guestToken?: string) {
  const cart = await resolveCart(userId, guestToken, false);
  if (!cart) return null;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return refresh(cart.id, userId, guestToken);
}

export async function applyCoupon(
  userId: string | undefined,
  code: string,
  guestToken?: string,
) {
  const cart = await resolveCart(userId, guestToken, false);
  if (!cart) throw new AppError(404, "Cart not found");
  const pricing = await priceCart(cart, code);
  if (pricing.coupon && !pricing.coupon.valid) {
    throw new AppError(400, pricing.coupon.message ?? "This code isn't valid");
  }
  return { cart, pricing };
}

/** On login, an anonymous cart is folded into the customer's saved cart. */
export async function mergeGuestCart(userId: string, guestToken: string) {
  const guest = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guest) return getCart(userId);

  const userCart = await resolveCart(userId, undefined, true);
  if (!userCart) throw new AppError(500, "Could not open your cart");

  for (const item of guest.items) {
    const existing = userCart.items.find((i) => i.variantId === item.variantId);
    const max = existing?.variant.stock ?? 0;
    const quantity = existing ? Math.min(max, existing.quantity + item.quantity) : item.quantity;
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guest.id } }).catch(() => null);
  return getCart(userId);
}

export async function getCartById(cartId: string, coupon?: string) {
  const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: includeCartItems });
  if (!cart) throw new AppError(404, "Cart not found");
  return { cart, pricing: await priceCart(cart, coupon) };
}

const refresh = (cartId: string, _userId?: string, _guestToken?: string) => getCartById(cartId);

export { guestTokenFor };
