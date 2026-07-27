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

declare module 'knex/types/tables' {
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
  // users
  // ---------------------------------------------------------------
  interface User extends LocationFields {
    id: string;
    phone: string | null;
    email: string | null;
    auth_provider: string | null;
    role:
      | 'citizen'
      | 'ward_officer'
      | 'constituency_admin'
      | 'county_admin'
      | 'mp_office'
      | 'super_admin';
    display_name: string | null;
    created_at: Date;
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

  interface Tables {
    devices: Knex.CompositeTableType<
      Device,
      // client_uuid/fingerprint_hash: at least one is required by the
      // check constraint — TS can't express the "at least one of" rule,
      // so both stay optional here; enforce it in a service-layer guard.
      Partial<Omit<Device, 'id' | 'first_seen_at' | 'last_seen_at' | 'trust_score' | 'submission_count'>>,
      Partial<Omit<Device, 'id'>>
    >;

    users: Knex.CompositeTableType<
      User,
      Partial<Omit<User, 'id' | 'created_at'>>,
      Partial<Omit<User, 'id'>>
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
  }
}