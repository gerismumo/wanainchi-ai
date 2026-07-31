import type { Knex } from 'knex';

// ---------------------------------------------------------------------
// discovered_categories
//
// Report categories aren't a fixed enum in this app — Gemma can propose a
// genuinely new category label when a report doesn't fit any of the seed
// categories (water/roads/electricity/health/education/security/
// environment/agriculture/governance/other) well. This table is where
// those proposals accumulate: every time a novel label comes back from
// Gemma, CategoryDiscoveryService either folds it into an existing
// discovered category (by name similarity) or creates a new row here with
// count 1. Once a discovered category's `report_count` crosses a small
// threshold, it graduates into `is_active` — meaning it's now injected
// into future Gemma prompts as a valid category choice, and shows up
// alongside the seed categories on dashboards, instead of every one-off
// phrasing variant silently piling up under "other" forever.
// ---------------------------------------------------------------------
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('discovered_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Normalized, storage/display-safe identifier (lowercase, underscores) —
    // this is the value actually written to reports.category once active.
    t.text('slug').notNullable().unique();

    // Human-readable label as Gemma first phrased it (e.g. "school uniform
    // shortages"), kept for display and for future similarity matching
    // against new candidate labels.
    t.text('label').notNullable();

    t.integer('report_count').notNullable().defaultTo(0);

    // Becomes true once report_count crosses the promotion threshold —
    // see CategoryDiscoveryService.PROMOTION_THRESHOLD.
    t.boolean('is_active').notNullable().defaultTo(false);

    t.timestamp('first_seen_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('last_seen_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['is_active'], 'idx_discovered_categories_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('discovered_categories');
}