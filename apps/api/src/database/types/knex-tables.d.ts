import { Knex } from 'knex';

// -----------------------------------------------------------------
// Notes on driver behavior (node-postgres, via Knex):
// - uuid            -> string
// - text / varchar  -> string
// - enum            -> string union (matches the check constraint)
// - decimal/numeric -> string by default (pg returns numeric as text
//                      to avoid float precision loss) — parseFloat()
//                      at the call site, or register a type parser
//                      for OID 1700 if you'd rather get numbers back.
// - timestamptz     -> Date (node-postgres parses these automatically)
// - jsonb           -> parsed automatically into the shape you gave it
// - bigint count(*) -> string, since JS numbers can't safely hold it
// -----------------------------------------------------------------

type LocationType = 'county' | 'constituency' | 'ward' | 'locality' | 'area';

// Shared across users / reports / ai_digests — mirrors addLocationColumns()
// in the migration. Every field is nullable since a row may have no
// location at all, or only the levels relevant to its location_type.
interface LocationFields {
  location_type: LocationType | null;
  location_code: string | null;
  location_name: string | null;
  county_code: string | null;
  county_name: string | null;
  constituency_code: string | null;
  constituency_name: string | null;
  locality_code: string | null;
  locality_name: string | null;
  location_raw: Record<string, unknown> | null;
}

// Every field in LocationFields is optional on insert — none of them
// are required, and all default to null.
type LocationFieldsInsert = Partial<LocationFields>;

// Well-known role names. Not an exhaustive union at the DB level (the
// roles table has no check constraint — new roles can be created
// without a migration), but useful as an autocomplete hint at call sites.
export type WellKnownRoleName =
  | 'citizen'
  | 'ward_officer'
  | 'constituency_admin'
  | 'county_admin'
  | 'mp_office'
  | 'super_admin';

declare module 'knex/types/tables' {
  // ---------------------------------------------------------------
  // roles
  // ---------------------------------------------------------------
  interface Role {
    id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
    created_at: Date;
    updated_at: Date;
  }

  // ---------------------------------------------------------------
  // users
  // Role now lives in user_roles (many-to-many) instead of a single
  // enum column — a user can hold more than one role at once.
  // ---------------------------------------------------------------
  interface User extends LocationFields {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    avatar_url: string | null;
    password_hash: string;
    failed_attempts: number;
    locked_until: Date | null;
    last_login_at: Date | null;
    is_active: boolean;
    is_email_verified: boolean;
    added_by: string | null; // self-referencing FK — who provisioned this account
    created_at: Date;
    updated_at: Date;
  }

  // ---------------------------------------------------------------
  // user_roles
  // Pure join table — composite primary key, no surrogate id and no
  // timestamps of its own.
  // ---------------------------------------------------------------
  interface UserRole {
    user_id: string;
    role_id: string;
  }

  // ---------------------------------------------------------------
  // password_resets
  // ---------------------------------------------------------------
  interface PasswordReset {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
    updated_at: Date;
  }

  // ---------------------------------------------------------------
  // user_login_history
  // Append-only — no updated_at, since a login event never changes
  // after the fact.
  // ---------------------------------------------------------------
  interface UserLoginHistory {
    id: string;
    user_id: string;
    ip_address: string | null;
    country: string | null; // ISO 3166-1 alpha-2
    city: string | null;
    is_successful: boolean;
    user_agent: string | null;
    created_at: Date;
  }

  // ---------------------------------------------------------------
  // devices
  // ---------------------------------------------------------------
  interface Device {
    id: string;
    client_uuid: string | null;
    fingerprint_hash: string | null;
    last_ip: string | null;
    user_agent: string | null;
    linked_user_id: string | null;
    trust_score: string; // numeric(4,3), defaults to '0.500'
    submission_count: number;
    first_seen_at: Date;
    last_seen_at: Date;
  }

  // ---------------------------------------------------------------
  // reports
  // ---------------------------------------------------------------
  interface Report extends LocationFields {
    id: string;
    user_id: string | null;
    device_id: string | null;
    type: 'voice' | 'text' | 'photo';
    content_text: string | null;
    media_url: string | null;
    language: string; // defaults to 'en'
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    summary: string | null;
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' | null;
    urgency_score: string | null; // numeric(4,3)
    confidence_score: string | null; // numeric(4,3)
    is_spam: boolean;
    spam_score: string | null; // numeric(4,3)
    duplicate_of: string | null;
    embedding_id: string | null;
    status: 'received' | 'processing' | 'reviewed' | 'in_progress' | 'resolved';
    created_at: Date;
    updated_at: Date;
  }

  // ---------------------------------------------------------------
  // votes
  // ---------------------------------------------------------------
  interface Vote {
    id: string;
    report_id: string;
    user_id: string | null;
    device_id: string | null;
    created_at: Date;
  }

  // ---------------------------------------------------------------
  // comments
  // ---------------------------------------------------------------
  interface Comment {
    id: string;
    report_id: string;
    user_id: string;
    content: string;
    created_at: Date;
  }

  // ---------------------------------------------------------------
  // abuse_logs
  // ---------------------------------------------------------------
  interface AbuseLog {
    id: string;
    report_id: string | null;
    device_id: string | null;
    ip_address: string | null;
    reason: 'rate_limit' | 'duplicate' | 'ai_flagged' | 'multi_account' | null;
    created_at: Date;
  }

  // ---------------------------------------------------------------
  // ai_digests
  // ---------------------------------------------------------------
  interface AiDigest extends LocationFields {
    id: string;
    period_start: string; // date column — returned as 'YYYY-MM-DD' string
    period_end: string;
    summary_text: string;
    top_issues: { category: string; count: number; avg_urgency: number }[] | null;
    report_count: number;
    created_at: Date;
  }

  // ---------------------------------------------------------------
  // Views — read-only. Insert/Update are `never` so a stray
  // knex('v_...').insert(...) fails to compile instead of failing
  // at runtime against a non-updatable view.
  // ---------------------------------------------------------------
  interface LocationSummaryView {
    location_type: LocationType;
    location_code: string;
    location_name: string | null;
    county_code: string | null;
    county_name: string | null;
    constituency_code: string | null;
    total_reports: string; // count(*) comes back as string (bigint)
    resolved_count: string;
    avg_urgency: string | null;
  }

  interface CountySummaryView {
    county_code: string;
    county_name: string | null;
    total_reports: string;
    resolved_count: string;
    avg_urgency: string | null;
  }

  interface TopCategoriesView {
    category: string;
    report_count: string;
    avg_urgency: string | null;
  }

  interface ReturningDevicesView {
    device_id: string;
    linked_user_id: string | null;
    trust_score: string;
    total_submissions: string;
    first_submission_at: Date;
    last_submission_at: Date;
  }

  // array_agg comes back as a JS array already (node-postgres parses
  // Postgres arrays); a user with no roles yields [null] rather than
  // [] because of the left join, so callers should filter nulls out.
  interface UserRosterView {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    last_login_at: Date | null;
    county_code: string | null;
    constituency_code: string | null;
    role_names: (string | null)[];
  }

  interface Tables {
    roles: Knex.CompositeTableType<
      Role,
      Pick<Role, 'name'> & Partial<Omit<Role, 'id' | 'name' | 'created_at' | 'updated_at'>>,
      Partial<Omit<Role, 'id'>>
    >;

    users: Knex.CompositeTableType<
      User,
      Pick<User, 'first_name' | 'last_name' | 'email' | 'password_hash'> &
        Partial<Omit<User, 'id' | 'first_name' | 'last_name' | 'email' | 'password_hash' | 'created_at' | 'updated_at'>>,
      Partial<Omit<User, 'id'>>
    >;

    user_roles: Knex.CompositeTableType<
      UserRole,
      UserRole, // both columns form the composite key — both required on insert
      never // no non-key columns to update; delete-and-reinsert instead
    >;

    password_resets: Knex.CompositeTableType<
      PasswordReset,
      Pick<PasswordReset, 'user_id' | 'token_hash' | 'expires_at'> &
        Partial<Omit<PasswordReset, 'id' | 'user_id' | 'token_hash' | 'expires_at' | 'created_at' | 'updated_at'>>,
      Partial<Omit<PasswordReset, 'id'>>
    >;

    user_login_history: Knex.CompositeTableType<
      UserLoginHistory,
      Pick<UserLoginHistory, 'user_id'> & Partial<Omit<UserLoginHistory, 'id' | 'user_id' | 'created_at'>>,
      Partial<Omit<UserLoginHistory, 'id'>>
    >;

    devices: Knex.CompositeTableType<
      Device,
      // client_uuid/fingerprint_hash: at least one is required by the
      // check constraint — TS can't express the "at least one of" rule,
      // so both stay optional here; enforce it in a service-layer guard.
      Partial<Omit<Device, 'id' | 'first_seen_at' | 'last_seen_at' | 'trust_score' | 'submission_count'>>,
      Partial<Omit<Device, 'id'>>
    >;

    reports: Knex.CompositeTableType<
      Report,
      Pick<Report, 'type'> &
        Partial<
          Omit<Report, 'id' | 'type' | 'is_spam' | 'language' | 'status' | 'created_at' | 'updated_at'>
        >,
      Partial<Omit<Report, 'id'>>
    >;

    votes: Knex.CompositeTableType<
      Vote,
      // user_id/device_id: at least one required by the check constraint,
      // same caveat as devices above.
      Pick<Vote, 'report_id'> & Partial<Omit<Vote, 'id' | 'report_id' | 'created_at'>>,
      Partial<Omit<Vote, 'id'>>
    >;

    comments: Knex.CompositeTableType<
      Comment,
      Pick<Comment, 'report_id' | 'user_id' | 'content'>,
      Partial<Omit<Comment, 'id'>>
    >;

    abuse_logs: Knex.CompositeTableType<
      AbuseLog,
      Partial<Omit<AbuseLog, 'id' | 'created_at'>>,
      Partial<Omit<AbuseLog, 'id'>>
    >;

    ai_digests: Knex.CompositeTableType<
      AiDigest,
      Pick<AiDigest, 'period_start' | 'period_end' | 'summary_text'> &
        LocationFieldsInsert &
        Partial<Omit<AiDigest, 'id' | 'period_start' | 'period_end' | 'summary_text' | 'created_at'>>,
      Partial<Omit<AiDigest, 'id'>>
    >;

    v_location_summary: Knex.CompositeTableType<LocationSummaryView, never, never>;
    v_county_summary: Knex.CompositeTableType<CountySummaryView, never, never>;
    v_top_categories: Knex.CompositeTableType<TopCategoriesView, never, never>;
    v_returning_devices: Knex.CompositeTableType<ReturningDevicesView, never, never>;
    v_user_roster: Knex.CompositeTableType<UserRosterView, never, never>;
  }
}