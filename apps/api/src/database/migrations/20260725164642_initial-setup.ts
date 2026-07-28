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
  // roles / users / user_roles
  // Role-based access replaces the old single `role` enum column —
  // a user can now hold more than one role (e.g. a ward officer who
  // is also a county_admin during a transition), and new roles can
  // be added without a migration.
  // ---------------------------------------------------------
  await knex.schema.createTable("roles", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable().unique(); // 'citizen' | 'ward_officer' | 'constituency_admin' | 'county_admin' | 'mp_office' | 'super_admin' | ...
    t.string("description").nullable();
    t.boolean("is_system_role").defaultTo(false); // true = seeded, can't be renamed/deleted from the UI
    t.timestamps(true, true);
  });

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("first_name").notNullable();
    t.text("last_name").notNullable();
    t.string("email").notNullable().unique();
    t.text("phone_number").nullable();
    t.text("avatar_url").nullable();
    t.string("password_hash").notNullable();
    t.integer("failed_attempts").defaultTo(0);
    t.timestamp("locked_until").nullable(); // set once failed_attempts trips a threshold
    t.timestamp("last_login_at").nullable();
    t.boolean("is_active").defaultTo(true);
    t.boolean("is_email_verified").defaultTo(false);

    addLocationColumns(t);

    // Self-referencing: who provisioned this account (e.g. a county_admin
    // inviting a ward_officer). Null for the first/seed admin.
    t.uuid("added_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    t.timestamps(true, true);
    t.index(["is_active"], "idx_users_active");
  });

  await knex.schema.createTable("user_roles", (t) => {
    t.uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    t.uuid("role_id")
      .notNullable()
      .references("id")
      .inTable("roles")
      .onDelete("CASCADE");
    t.primary(["user_id", "role_id"]);
    t.index(["role_id"], "idx_user_roles_role");
  });

  // ---------------------------------------------------------
  // password_resets
  // Short-lived, single-use tokens. Only the hash is stored so a
  // leaked table doesn't hand out working reset links.
  // ---------------------------------------------------------
  await knex.schema.createTable("password_resets", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    t.string("token_hash").notNullable();
    t.timestamp("expires_at").notNullable();
    t.boolean("used").defaultTo(false);
    t.timestamps(true, true);
    t.index(["user_id"], "idx_password_resets_user");
    t.index(["expires_at"], "idx_password_resets_expires");
  });

  // ---------------------------------------------------------
  // user_login_history
  // Append-only audit trail — powers both the "recent activity"
  // panel on a user's profile and lockout/anomaly detection
  // (repeated is_successful = false from new countries, etc).
  // ---------------------------------------------------------
  await knex.schema.createTable("user_login_history", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    t.string("ip_address", 45).nullable(); // fits IPv6
    t.string("country", 2).nullable(); // ISO 3166-1 alpha-2
    t.string("city").nullable();
    t.boolean("is_successful").defaultTo(true);
    t.text("user_agent").nullable();
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index(["user_id"], "idx_login_history_user");
    t.index(["created_at"], "idx_login_history_created_at");
  });

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
    create or replace view v_location_summary as
    select
      location_type,
      location_code,
      max(location_name)         as location_name,
      max(county_code)           as county_code,
      max(county_name)           as county_name,
      max(constituency_code)     as constituency_code,
      max(constituency_name)     as constituency_name,
      max(locality_code)         as locality_code,
      max(locality_name)         as locality_name,
      count(*) filter (where is_spam = false)                          as total_reports,
      count(*) filter (where is_spam = false and status = 'resolved')  as resolved_count,
      avg(urgency_score)  filter (where is_spam = false)               as avg_urgency
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
    create or replace view v_top_categories as
    select
      category,
      count(*)           as report_count,
      avg(urgency_score) as avg_urgency
    from reports
    where is_spam = false
      and category is not null
    group by category
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

  // ---------------------------------------------------------
  // Staff roster view — one row per admin/officer user with their
  // role names flattened into an array, so the admin UI doesn't
  // have to join user_roles/roles itself for a simple listing.
  // ---------------------------------------------------------
  await knex.raw(`
    create view v_user_roster as
    select
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.is_active,
      u.last_login_at,
      u.county_code,
      u.constituency_code,
      array_agg(r.name order by r.name) as role_names
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    group by u.id
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`drop view if exists v_user_roster`);
  await knex.raw(`drop view if exists v_returning_devices`);
  await knex.raw(`drop view if exists v_top_categories`);
  await knex.raw(`drop view if exists v_county_summary`);
  await knex.raw(`drop view if exists v_location_summary`);

  await knex.schema.dropTableIfExists("ai_digests");
  await knex.schema.dropTableIfExists("abuse_logs");
  await knex.schema.dropTableIfExists("votes");
  await knex.schema.dropTableIfExists("reports");

  await knex.schema.alterTable("devices", (t) => {
    t.dropForeign(["linked_user_id"]);
  });

  await knex.schema.dropTableIfExists("user_login_history");
  await knex.schema.dropTableIfExists("password_resets");
  await knex.schema.dropTableIfExists("user_roles");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("devices");
  await knex.schema.dropTableIfExists("roles");

  await knex.raw('drop extension if exists "pgcrypto"');
}