import type { ZimCategoriesSpec } from '../../types/collections.js'

/**
 * Curated resources rejected by this emergency-family profile after hands-on
 * content auditing. Upstream's live manifest can reintroduce them whenever it
 * refreshes, so filtering only the checked-in JSON is not sufficient.
 */
export const REJECTED_EMERGENCY_RESOURCE_IDS = new Set([
  'libretexts.org_en_med',
  'zimgit-medicine_en',
])

export function filterRejectedEmergencyResources(spec: ZimCategoriesSpec): ZimCategoriesSpec {
  return {
    ...spec,
    categories: spec.categories.map((category) => ({
      ...category,
      tiers: category.tiers.map((tier) => ({
        ...tier,
        resources: tier.resources.filter(
          (resource) => !REJECTED_EMERGENCY_RESOURCE_IDS.has(resource.id)
        ),
      })),
    })),
  }
}
