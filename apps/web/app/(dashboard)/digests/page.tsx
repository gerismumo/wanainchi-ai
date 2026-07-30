"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles, MapPin, Calendar, ChevronRight,
  Loader2, AlertTriangle, RefreshCw, FileText,
  Zap, BarChart3, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDigests, useGenerateDigest } from "@/hooks/useDigests";
import { LocationPicker } from "@/components/location-picker";
import type { ResolvedLocation, LocationType } from "@/components/location-picker";
import type { IAiDigest, DigestQueryParams } from "@/types/digests.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  const e = new Date(end).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  return `${s} – ${e}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function DigestCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="h-3 w-3/5 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-5 w-16 rounded-full bg-muted" />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Digest card
// ---------------------------------------------------------------------------
function DigestCard({ digest }: { digest: IAiDigest }) {
  const location = [digest.location_name, digest.constituency_name, digest.county_name]
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  const topIssues = (digest.top_issues ?? []).slice(0, 3);

  return (
    <Link
      href={`/digests/${digest.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm active:scale-[0.99]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            {location && (
              <div className="flex items-center gap-1 mb-0.5">
                <MapPin className="size-3 shrink-0 text-muted-foreground" />
                <p className="truncate text-[11px] text-muted-foreground">{location}</p>
              </div>
            )}
            <p className="text-sm font-semibold text-card-foreground">
              {formatPeriod(digest.period_start, digest.period_end)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <FileText className="size-3" />
            {digest.report_count.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {digest.summary_text}
      </p>

      {/* Top issues */}
      {topIssues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topIssues.map((issue) => (
            <span
              key={issue.category}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium capitalize text-card-foreground"
            >
              <span className={cn(
                "size-1.5 rounded-full",
                issue.avg_urgency >= 0.7 ? "bg-destructive" :
                issue.avg_urgency >= 0.5 ? "bg-orange-500" : "bg-primary"
              )} />
              {issue.category}
              <span className="text-muted-foreground">×{issue.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-[11px] text-muted-foreground">
          Generated {formatDate(digest.created_at)}
        </span>
        <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Generate form
// ---------------------------------------------------------------------------
type QuickRange = "7" | "14" | "30" | "custom";

function GeneratePanel({
  onGenerated,
}: { onGenerated: () => void }) {
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [range, setRange] = useState<QuickRange>("30");
  const [customStart, setCustomStart] = useState(daysAgoStr(30));
  const [customEnd, setCustomEnd] = useState(todayStr());
  const [open, setOpen] = useState(false);
  const { execute, isLoading } = useGenerateDigest();

  const periodStart = range === "custom" ? customStart : daysAgoStr(Number(range));
  const periodEnd = range === "custom" ? customEnd : todayStr();

  const handleGenerate = async () => {
    if (!location) {
      toast.error("Select a location first");
      return;
    }
    const result = await execute({
      location_type: location.location_type as LocationType,
      location_code: location.location_code,
      period_start: periodStart,
      period_end: periodEnd,
    });
    if (!result.success) {
      toast.error("Failed to generate digest", { description: result.message });
    } else {
      toast.success("Digest generated", {
        description: `${location.location_name} · ${formatPeriod(periodStart, periodEnd)}`,
      });
      setOpen(false);
      onGenerated();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Generate New Digest</p>
            <p className="text-[11px] text-muted-foreground">AI summarises reports for any location + period</p>
          </div>
        </div>
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>

      {/* Form */}
      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Location */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Location</p>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          {/* Period */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Period</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["7", "14", "30", "custom"] as QuickRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                    range === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {r === "custom" ? "Custom" : `Last ${r} days`}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">From</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">To</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            )}
            {range !== "custom" && (
              <p className="text-[11px] text-muted-foreground">
                {formatPeriod(periodStart, periodEnd)}
              </p>
            )}
          </div>

          <Button className="w-full gap-2" onClick={handleGenerate} disabled={isLoading || !location}>
            {isLoading ? (
              <><Loader2 className="size-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="size-4" /> Generate Digest</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const PAGE_SIZE = 12;

export default function DigestsPage() {
  const [filterLocation, setFilterLocation] = useState<ResolvedLocation | null>(null);
  const [page, setPage] = useState(1);

  const query: DigestQueryParams = {
    page,
    limit: PAGE_SIZE,
    location_type: filterLocation?.location_type as LocationType | undefined,
    location_code: filterLocation?.location_code,
  };

  const { data, error, isLoading, mutate } = useDigests(query);

  const handleGenerated = useCallback(() => {
    setPage(1);
    mutate();
  }, [mutate]);

  const digests = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5 pb-10">

      {/* Generate panel */}
      <GeneratePanel onGenerated={handleGenerated} />

      {/* Filter bar */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Filter by location
        </p>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <LocationPicker
              value={filterLocation}
              onChange={(loc) => { setFilterLocation(loc); setPage(1); }}
              placeholder="All locations…"
              showDetect={false}
            />
          </div>
          {filterLocation && (
            <button
              type="button"
              onClick={() => { setFilterLocation(null); setPage(1); }}
              className="mt-1.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Loading…</span>
          ) : (
            <><span className="font-medium text-foreground">{total.toLocaleString()}</span> digests</>
          )}
        </p>
        {!isLoading && (
          <button onClick={() => mutate()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="size-3" /> Refresh
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <DigestCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 py-14 text-center">
          <AlertTriangle className="size-6 text-destructive" />
          <p className="text-sm font-medium text-foreground">Failed to load digests</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1.5 text-xs">
            <RefreshCw className="size-3" /> Retry
          </Button>
        </div>
      ) : digests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {digests.map((d) => <DigestCard key={d.id} digest={d} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No digests yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filterLocation
                ? `No digests for ${filterLocation.location_name}. Generate one above.`
                : "Use the form above to generate your first AI digest."}
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
