export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Adds a short random suffix so slugs stay unique without a DB round-trip loop. */
export function uniqueSlug(value: string) {
  const base = slugify(value) || "item";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
