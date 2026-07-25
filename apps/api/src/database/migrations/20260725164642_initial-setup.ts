import type { Knex } from "knex";

// ---------------------------------------------------------------
// Location columns are duplicated across users/reports/ai_digests
// via a shared column-builder helper. They mirror the npm package's
// hierarchy (ICounty/IConstituency/IWard/ILocality/IArea) so that a
// ward-level row still carries its constituency_code and county_code
// — letting the dashboard roll up to any level with a plain filter,
// no join, no owned locations table.
// ---------------------------------------------------------------
function addLocationColumns(t: Knex.CreateTableBuilder) {
  t.enum("location_type", [
    "county",
    "constituency",
    "ward",
    "locality",
    "area",
  ]).nullable();
  t.text("location_code").nullable(); // this row's own code, whatever level it is
  t.text("location_name").nullable(); // cached name, avoids re-calling the package

  // Full ancestry, flattened. Only the levels that apply to
  // location_type are populated — e.g. a "county" row leaves
  // constituency_code/locality_code null.
  t.text("county_code").nullable();
  t.text("county_name").nullable();
  t.text("constituency_code").nullable();
  t.text("constituency_name").nullable();
  t.text("locality_code").nullable(); // also used for IArea.locality
  t.text("locality_name").nullable();

  // Exact snapshot of whatever the npm package returned — a
  // safety net if a future dashboard needs a field we didn't
  // think to flatten (e.g. IArea's raw shape).
  t.jsonb("location_raw").nullable();
}

export async function up(knex: Knex): Promise<void> {
  // ---------------------------------------------------------
  // Extensions
  // ---------------------------------------------------------
  await knex.raw('create extension if not exists "pgcrypto"');

  // ---------------------------------------------------------
  // devices
  // Anonymous-identity table. No login required: the frontend
  // generates a persistent client_uuid (cookie/localStorage) on
  // first visit and sends it with every submission. fingerprint_hash
  // is a fallback signal (canvas/screen/timezone hash) for the case
  // where storage gets cleared but the physical device is the same.
  // If the person ever verifies (phone/email OTP), linked_user_id
  // retroactively attaches their whole anonymous history to the new
  // account — without touching a single existing report row.
  // ---------------------------------------------------------
  await knex.schema.createTable("devices", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    t.uuid("client_uuid").unique(); // primary signal: frontend-generated, persisted client-side
    t.text("fingerprint_hash").unique(); // fallback signal: hash of browser/device traits
    t.specificType("last_ip", "inet");
    t.text("user_agent");

    t.uuid("linked_user_id"); // FK added below, once the users table exists
    t.decimal("trust_score", 4, 3).notNullable().defaultTo(0.5); // rises with clean submission history
    t.integer("submission_count").notNullable().defaultTo(0);

    t.timestamp("first_seen_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("last_seen_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.check("client_uuid is not null or fingerprint_hash is not null");
  });

  // ---------------------------------------------------------
  // users
  // Verified citizens and government officials. Anonymous
  // citizens never get a row here — they're a device, not a user.
  // ---------------------------------------------------------
  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    t.string("phone").unique();
    t.string("email").unique();
    t.string("auth_provider"); // 'phone_otp' | 'email_otp' | 'google'

    t.enum("role", [
      "citizen",
      "ward_officer",
      "constituency_admin",
      "county_admin",
      "mp_office",
      "super_admin",
    ])
      .notNullable()
      .defaultTo("citizen");

    addLocationColumns(t);

    t.string("display_name");
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index("role");
    t.index(["location_type", "location_code"]);
    t.index("county_code");
  });

  // Now that users exists, wire up the FK we deferred above.
  await knex.schema.alterTable("devices", (t) => {
    t.foreign("linked_user_id").references("id").inTable("users").onDelete("SET NULL");
  });

  await knex.raw(`create index idx_devices_linked_user on devices (linked_user_id)`);

  // ---------------------------------------------------------
  // reports
  // ---------------------------------------------------------
  await knex.schema.createTable("reports", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    t.uuid("user_id").references("id").inTable("users"); // set once verified
    t.uuid("device_id").references("id").inTable("devices"); // set always — anonymous or not

    t.enum("type", ["voice", "text", "photo"]).notNullable();
    t.text("content_text"); // transcript or typed text
    t.text("media_url"); // storage path for the raw voice/photo file
    t.string("language").defaultTo("en"); // 'en' | 'sw' | 'sheng'

    addLocationColumns(t);

    // Precise pin, independent of the administrative code above —
    // useful when the report is more specific than "this ward".
    t.double("latitude");
    t.double("longitude");

    // Gemma-generated fields, populated after AI processing
    t.text("category"); // 'water' | 'roads' | 'health' | 'security' | ...
    t.text("summary");
    t.enum("sentiment", ["positive", "neutral", "negative", "urgent"]);
    t.decimal("urgency_score", 4, 3); // 0.000 - 1.000
    t.decimal("confidence_score", 4, 3);

    // Moderation / dedupe, inline rather than a side table
    t.boolean("is_spam").notNullable().defaultTo(false);
    t.decimal("spam_score", 4, 3);
    t.uuid("duplicate_of").references("id").inTable("reports");
    t.text("embedding_id"); // Qdrant point ID — vectors live outside Postgres

    t.enum("status", [
      "received",
      "processing",
      "reviewed",
      "in_progress",
      "resolved",
    ])
      .notNullable()
      .defaultTo("received");

    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(["location_type", "location_code"]);
    t.index("county_code");
    t.index("constituency_code");
    t.index("category");
    t.index("status");
    t.index("created_at");
    t.index("device_id");
  });

  // partial index: fast "active, non-spam reports" queries for the dashboard
  await knex.raw(
    `create index idx_reports_not_spam on reports (is_spam) where is_spam = false`
  );

  // ---------------------------------------------------------
  // votes
  // ---------------------------------------------------------
  await knex.schema.createTable("votes", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("report_id").notNullable().references("id").inTable("reports").onDelete("CASCADE");
    t.uuid("user_id").references("id").inTable("users");
    t.uuid("device_id").references("id").inTable("devices");
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.check("user_id is not null or device_id is not null");
  });

  // one vote per identity per report — device_id is the anonymous
  // identity now instead of a raw fingerprint string
  await knex.raw(
    `create unique index uq_votes_user on votes (report_id, user_id) where user_id is not null`
  );
  await knex.raw(
    `create unique index uq_votes_device on votes (report_id, device_id) where device_id is not null`
  );

  // ---------------------------------------------------------
  // comments
  // ---------------------------------------------------------
  await knex.schema.createTable("comments", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("report_id").notNullable().references("id").inTable("reports").onDelete("CASCADE");
    // Verified users only for comments — keeps abuse surface smaller
    // for a one-day build than allowing anonymous comments too.
    t.uuid("user_id").notNullable().references("id").inTable("users");
    t.text("content").notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index("report_id");
  });

  // ---------------------------------------------------------
  // abuse_logs
  // ---------------------------------------------------------
  await knex.schema.createTable("abuse_logs", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("report_id").references("id").inTable("reports").onDelete("SET NULL");
    t.uuid("device_id").references("id").inTable("devices");
    t.specificType("ip_address", "inet");
    t.enum("reason", ["rate_limit", "duplicate", "ai_flagged", "multi_account"]);
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index("device_id");
  });

  // ---------------------------------------------------------
  // ai_digests
  // ---------------------------------------------------------
  await knex.schema.createTable("ai_digests", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    addLocationColumns(t);

    t.date("period_start").notNullable();
    t.date("period_end").notNullable();
    t.text("summary_text").notNullable();
    t.jsonb("top_issues"); // [{ category, count, avg_urgency }, ...]
    t.integer("report_count").defaultTo(0);
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(["location_type", "location_code", "period_start"]);
    t.index("county_code");
  });

  // ---------------------------------------------------------
  // Dashboard views — rollups at any level via the flattened
  // county_code/constituency_code columns, no join required.
  // ---------------------------------------------------------
  await knex.raw(`
    create view v_location_summary as
    select
      location_type,
      location_code,
      max(location_name) as location_name,
      max(county_code) as county_code,
      max(county_name) as county_name,
      max(constituency_code) as constituency_code,
      count(*) filter (where is_spam = false) as total_reports,
      count(*) filter (where status = 'resolved') as resolved_count,
      avg(urgency_score) filter (where is_spam = false) as avg_urgency
    from reports
    where location_code is not null
    group by location_type, location_code
  `);

  await knex.raw(`
    create view v_county_summary as
    select
      county_code,
      max(county_name) as county_name,
      count(*) filter (where is_spam = false) as total_reports,
      count(*) filter (where status = 'resolved') as resolved_count,
      avg(urgency_score) filter (where is_spam = false) as avg_urgency
    from reports
    where county_code is not null
    group by county_code
  `);

  await knex.raw(`
    create view v_top_categories as
    select
      category,
      count(*) as report_count,
      avg(urgency_score) as avg_urgency
    from reports
    where is_spam = false and category is not null
    group by category
    order by report_count desc
  `);

  // ---------------------------------------------------------
  // Repeat-submitter view — the payoff of tracking devices:
  // "who's coming back" without ever asking anyone to log in.
  // ---------------------------------------------------------
  await knex.raw(`
    create view v_returning_devices as
    select
      d.id as device_id,
      d.linked_user_id,
      d.trust_score,
      count(r.id) as total_submissions,
      min(r.created_at) as first_submission_at,
      max(r.created_at) as last_submission_at
    from devices d
    join reports r on r.device_id = d.id
    group by d.id, d.linked_user_id, d.trust_score
    having count(r.id) > 1
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`drop view if exists v_returning_devices`);
  await knex.raw(`drop view if exists v_top_categories`);
  await knex.raw(`drop view if exists v_county_summary`);
  await knex.raw(`drop view if exists v_location_summary`);

  await knex.schema.dropTableIfExists("ai_digests");
  await knex.schema.dropTableIfExists("abuse_logs");
  await knex.schema.dropTableIfExists("comments");
  await knex.schema.dropTableIfExists("votes");
  await knex.schema.dropTableIfExists("reports");

  await knex.schema.alterTable("devices", (t) => {
    t.dropForeign(["linked_user_id"]);
  });
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("devices");

  await knex.raw('drop extension if exists "pgcrypto"');
}