import type { Prisma } from "@prisma/client";

type Money = Prisma.Decimal | number | string;

export const toNumber = (value: Money | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value.toString());

/** Rounds to 2 decimals and strips floating point noise. */
export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const formatMoney = (value: Money, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(toNumber(value));
