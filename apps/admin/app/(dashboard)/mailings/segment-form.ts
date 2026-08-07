import type { CampaignSegment } from "@lions/core";
import type { ProductKind } from "@lions/db";

const VALID_PRODUCT_KINDS: ProductKind[] = ["TICKET", "MERCHANDISE"];
const VALID_CHECKED_IN_FILTERS = ["ANY", "NOT_CHECKED_IN", "CHECKED_IN"] as const;

export function parseSegmentFromFormData(formData: FormData): CampaignSegment {
  const eventId = String(formData.get("eventId") ?? "");
  const productKinds = formData
    .getAll("productKinds")
    .map(String)
    .filter((v): v is ProductKind => VALID_PRODUCT_KINDS.includes(v as ProductKind));
  const checkedInFilterRaw = String(formData.get("checkedInFilter") ?? "ANY");
  const checkedInFilter = VALID_CHECKED_IN_FILTERS.includes(
    checkedInFilterRaw as (typeof VALID_CHECKED_IN_FILTERS)[number],
  )
    ? (checkedInFilterRaw as (typeof VALID_CHECKED_IN_FILTERS)[number])
    : "ANY";

  return { eventId, productKinds: productKinds.length > 0 ? productKinds : undefined, checkedInFilter };
}
