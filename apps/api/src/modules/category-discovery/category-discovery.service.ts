import { Injectable, Logger } from '@nestjs/common';
import { CategoryDiscoveryRepository } from './category-discovery.repository';
import { REPORT_CATEGORIES } from '../ai/ai.types';

// A brand-new category label needs to show up this many times before it's
// promoted into the active vocabulary (injected into future Gemma prompts,
// surfaced as a first-class category on dashboards). Below this threshold
// it's still stored under its own slug — so reports DO group together
// immediately — it just isn't advertised as a "known" category yet, since
// a single odd report shouldn't get elevated to a permanent category.
const PROMOTION_THRESHOLD = 3;

// Two candidate labels are treated as "the same emerging category" if their
// word overlap clears this bar — catches "school uniform shortage" vs
// "shortage of school uniforms" without needing embeddings for something
// this coarse-grained.
const LABEL_SIMILARITY_THRESHOLD = 0.5;

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .slice(0, 60);
}

function wordSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  for (const word of setA) if (setB.has(word)) intersection += 1;

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

@Injectable()
export class CategoryDiscoveryService {
  private readonly logger = new Logger(CategoryDiscoveryService.name);

  constructor(private readonly repo: CategoryDiscoveryRepository) {}

  /**
   * The full category vocabulary to hand Gemma on the next call: the fixed
   * seed list plus every discovered category that's proven itself
   * recurring. Keeping this dynamic means Gemma starts consistently
   * reusing "school_uniforms" once it exists, instead of re-describing the
   * same theme slightly differently on every report.
   */
  async getAllowedCategories(): Promise<string[]> {
    const active = await this.repo.findAllActive();
    return [...REPORT_CATEGORIES.filter((c) => c !== 'other'), ...active.map((c) => c.slug), 'other'];
  }

  /**
   * Takes whatever category string Gemma returned and resolves it to a
   * stable slug, grouping it with any similar label already seen:
   *   - A seed category (water/roads/... /other) passes through untouched.
   *   - An exact-slug match to an existing discovered category increments
   *     its count (and promotes it once the threshold is crossed).
   *   - A label similar enough to an existing discovered category's label
   *     (by word overlap) is folded into that same slug, rather than
   *     spawning a near-duplicate category for a slightly different phrasing.
   *   - Otherwise, a brand-new discovered category is created with count 1.
   *
   * The returned slug is what gets written to reports.category — grouping
   * happens automatically the moment two reports resolve to the same slug,
   * well before the category is "official" enough to be promoted.
   */
  /**
   * Every category discovered so far (active and still-emerging), sorted by
   * recurrence — used by the analytics dashboard to show what's being
   * auto-grouped and what's still just a candidate.
   */
  async getAllDiscovered() {
    return this.repo.findAll();
  }

  async resolveCategory(rawCategory: string): Promise<string> {
    const trimmed = rawCategory?.trim();
    if (!trimmed) return 'other';

    const normalized = trimmed.toLowerCase();
    if ((REPORT_CATEGORIES as string[]).includes(normalized)) {
      return normalized;
    }

    const slug = slugify(trimmed);
    if (!slug) return 'other';

    const existingBySlug = await this.repo.findBySlug(slug);
    if (existingBySlug) {
      const updated = await this.repo.incrementAndMaybeActivate(slug, PROMOTION_THRESHOLD);
      this.logNewlyActive(updated);
      return updated.slug;
    }

    const existingCategories = await this.repo.findAll();
    const similarMatch = existingCategories.find(
      (c) => wordSimilarity(c.label, trimmed) >= LABEL_SIMILARITY_THRESHOLD,
    );
    if (similarMatch) {
      const updated = await this.repo.incrementAndMaybeActivate(similarMatch.slug, PROMOTION_THRESHOLD);
      this.logNewlyActive(updated);
      return updated.slug;
    }

    const created = await this.repo.create(slug, trimmed);
    this.logger.log(`New candidate category discovered: "${trimmed}" → ${created.slug}`);
    return created.slug;
  }

  private logNewlyActive(category: { slug: string; is_active: boolean; report_count: number }): void {
    if (category.is_active && category.report_count === PROMOTION_THRESHOLD) {
      this.logger.log(
        `Category "${category.slug}" promoted to active vocabulary after ${category.report_count} reports`,
      );
    }
  }
}
