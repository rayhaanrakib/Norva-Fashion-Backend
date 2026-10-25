import Stripe from "stripe";
import config from "../config";

/** Stripe is optional: an unset key enables the deterministic sandbox flow. */
export const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion })
  : null;

export const isStripeConfigured = Boolean(config.stripe.secretKey);
