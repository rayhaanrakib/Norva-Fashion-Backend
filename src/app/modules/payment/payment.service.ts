import type { Order } from "@prisma/client";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { isStripeConfigured, stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../utils/activity";
import { toNumber } from "../../utils/money";

export type IntentResult = {
  provider: "STRIPE" | "SANDBOX" | "COD";
  clientSecret: string | null;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  mode: "live" | "sandbox" | "cod";
};

const minorUnits = (amount: number) => Math.round(amount * 100);

/**
 * Creates a payment intent for an order. With no Stripe key configured the
 * API returns a deterministic sandbox secret so the storefront demo can
 * complete a checkout end-to-end without any credentials.
 */
export async function createIntent(orderId: string, provider: "STRIPE" | "COD" | "SANDBOX" = "STRIPE"): Promise<IntentResult> {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: { payment: true },
  });
  if (!order) throw new AppError(404, "Order not found");
  if (order.paymentStatus === "PAID") throw new AppError(409, "This order is already paid");

  if (provider === "COD") {
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { provider: "COD", status: "PENDING", amount: order.grandTotal },
      create: {
        orderId: order.id,
        provider: "COD",
        status: "PENDING",
        amount: order.grandTotal,
        currency: order.currency,
      },
    });
    return {
      provider: "COD",
      clientSecret: null,
      paymentIntentId: null,
      amount: toNumber(order.grandTotal),
      currency: order.currency.toLowerCase(),
      mode: "cod",
    };
  }

  if (!isStripeConfigured || !stripe) {
    const reference = `sandbox_${order.number}`;
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { provider: "SANDBOX", status: "PENDING", clientSecret: reference },
      create: {
        orderId: order.id,
        provider: "SANDBOX",
        status: "PENDING",
        amount: order.grandTotal,
        currency: order.currency,
        clientSecret: reference,
      },
    });

    return {
      provider: "SANDBOX",
      clientSecret: `${reference}_secret`,
      paymentIntentId: reference,
      amount: toNumber(order.grandTotal),
      currency: order.currency.toLowerCase(),
      mode: "sandbox",
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: minorUnits(toNumber(order.grandTotal)),
    currency: config.stripe.currency,
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: order.id, orderNumber: order.number },
  });

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { provider: "STRIPE", clientSecret: intent.client_secret, providerRef: intent.id },
    create: {
      orderId: order.id,
      provider: "STRIPE",
      status: "PENDING",
      amount: order.grandTotal,
      currency: order.currency,
      clientSecret: intent.client_secret,
      providerRef: intent.id,
    },
  });

  return {
    provider: "STRIPE",
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: toNumber(order.grandTotal),
    currency: order.currency.toLowerCase(),
    mode: "live",
  };
}

/** Sandbox-only confirmation used by the demo storefront. */
export async function confirmSandbox(orderId: string) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: { payment: true },
  });
  if (!order) throw new AppError(404, "Order not found");
  if (order.payment?.provider !== "SANDBOX") {
    throw new AppError(409, "This order isn't using the sandbox payment flow");
  }
  return markPaid(order, "SANDBOX");
}

async function markPaid(order: Order, reference: string) {
  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
        confirmedAt: order.confirmedAt ?? new Date(),
        events: { create: { status: "CONFIRMED", note: `Payment received (${reference})` } },
      },
      include: { items: true, payment: true },
    }),
    prisma.payment.update({
      where: { orderId: order.id },
      data: { status: "PAID", paidAt: new Date(), providerRef: reference },
    }),
  ]);

  await logActivity("PAYMENT_CONFIRMED", "Order", order.id, null, { reference });
  return updated;
}

/** Idempotent webhook handler — replaying the same event changes nothing. */
export async function handleWebhookEvent(event: {
  type: string;
  data: { object: any };
}) {
  const intent = event.data.object;

  if (event.type === "payment_intent.succeeded") {
    const orderId = intent?.metadata?.orderId as string | undefined;
    if (!orderId) return { handled: false, reason: "missing order metadata" };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) return { handled: false, reason: "order not found" };
    if (order.paymentStatus === "PAID") return { handled: true, reason: "already processed" };

    await markPaid(order, intent.id);
    return { handled: true, reason: "marked paid" };
  }

  if (event.type === "payment_intent.payment_failed") {
    const orderId = intent?.metadata?.orderId as string | undefined;
    if (orderId) {
      await prisma.payment.updateMany({
        where: { orderId },
        data: { status: "FAILED" },
      });
      await prisma.order.updateMany({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
    }
    return { handled: true, reason: "marked failed" };
  }

  return { handled: false, reason: `unhandled event ${event.type}` };
}

export async function refund(orderId: string, actorId: string) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: { payment: true },
  });
  if (!order) throw new AppError(404, "Order not found");
  if (order.paymentStatus !== "PAID") throw new AppError(409, "Only paid orders can be refunded");

  if (order.payment?.provider === "STRIPE" && isStripeConfigured && stripe && order.payment.providerRef) {
    await stripe.refunds.create({ payment_intent: order.payment.providerRef });
  }

  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "REFUNDED",
        status: "REFUNDED",
        events: { create: { status: "REFUNDED", note: "Refund issued", actorId } },
      },
      include: { items: true, payment: true },
    }),
    prisma.payment.update({
      where: { orderId: order.id },
      data: { status: "REFUNDED", refundedAt: new Date() },
    }),
  ]);

  await logActivity("PAYMENT_REFUNDED", "Order", order.id, actorId);
  return updated;
}
