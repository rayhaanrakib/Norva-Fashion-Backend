import crypto from "node:crypto";

/** Human-friendly, sortable order reference: NV-7K4M2Q-3X. */
export function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `NV-${stamp}-${suffix}`;
}
