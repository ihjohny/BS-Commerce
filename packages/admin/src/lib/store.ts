/** Shared store-view helpers for Dashboard/Reports selects. */

export interface StoreDoc {
  id: string;
  name?: string | null;
  code?: string | null;
}
/**
 * Trigger label for the store-view select: the picked store's
 * "Name (CODE)", or the all-stores placeholder when none is picked.
 */
export function storeViewLabel(
  stores: StoreDoc[],
  storeId: string,
): string {
  if (!storeId) return "All store views";
  const s = stores.find((x) => x.id === storeId);
  return s ? `${s.name ?? s.id}${s.code ? ` (${s.code})` : ""}` : storeId;
}
