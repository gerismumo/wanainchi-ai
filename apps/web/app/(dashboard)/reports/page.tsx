"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ReportRow } from "@/components/dashboard/report-row";
import type { ReportRowData } from "@/components/dashboard/report-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReports } from "@/hooks/useReports";
import { Loader2, AlertTriangle, RefreshCw, Search, X, ShieldAlert, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { IReport, ReportStatus } from "@/types/reports.types";
import { LocationType } from "@/types/users.types";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------
function toRowData(r: IReport): ReportRowData {
  return {
    id: r.id,
    type: r.type,
    category: r.category ?? "other",
    summary: r.summary ?? r.content_text ?? "No summary available",
    locationName: r.location_name ?? r.county_name ?? r.constituency_name ?? "Unknown location",
    status: r.status,
    sentiment: r.sentiment ?? "neutral",
    urgencyScore: r.urgency_score ?? 0,
    createdAt: r.created_at,
    isSpam: r.is_spam,
  };
}

// ---------------------------------------------------------------------------
// Filter constants
// ---------------------------------------------------------------------------
type StatusFilter = "all" | ReportStatus;
type CategoryFilter = "all" | string;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "processing", label: "Processing" },
  { value: "reviewed", label: "Reviewed" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "water", label: "Water" },
  { value: "roads", label: "Roads" },
  { value: "health", label: "Health" },
  { value: "security", label: "Security" },
  { value: "education", label: "Education" },
  { value: "electricity", label: "Electricity" },
  { value: "sanitation", label: "Sanitation" },
  { value: "other", label: "Other" },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="size-8 shrink-0 rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-3 w-56 rounded bg-muted" />
      </div>
      <div className="hidden h-3 w-20 rounded bg-muted sm:block" />
      <div className="h-3 w-10 rounded bg-muted" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner client component — uses useSearchParams, safe inside Suspense
// ---------------------------------------------------------------------------
function ReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read location filters from URL
  const urlLocationType = searchParams.get("location_type") as LocationType | null;
  const urlLocationCode = searchParams.get("location_code");
  const urlLocationName = searchParams.get("location_name");

  const [status, setStatus]     = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSpam, setShowSpam] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 400);
  }, []);

  useEffect(() => { setPage(1); }, [status, category, showSpam]);

  const { data, error, isLoading, mutate } = useReports({
    page,
    limit: PAGE_SIZE,
    status: status !== "all" ? (status as ReportStatus) : undefined,
    category: category !== "all" ? category : undefined,
    q: debouncedSearch || undefined,
    include_spam: showSpam || undefined,
    location_type: urlLocationType ?? undefined,
    location_code: urlLocationCode ?? undefined,
  });

  useEffect(() => {
    if (error) toast.error("Failed to load reports", { description: error.message });
  }, [error]);

  const rows = (data?.items ?? []).map(toRowData);
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;
  const hasLocationFilter = !!urlLocationType && !!urlLocationCode;
  const hasActiveFilters = status !== "all" || category !== "all" || debouncedSearch !== "" || showSpam || hasLocationFilter;

  const clearFilters = () => {
    setStatus("all"); setCategory("all");
    setSearch(""); setDebouncedSearch(""); setPage(1); setShowSpam(false);
    if (hasLocationFilter) router.push(pathname);
  };

  const clearLocationFilter = () => router.push(pathname);

  return (
    <div className="space-y-4">
      {/* Location filter banner */}
      {hasLocationFilter && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary">Filtered by location</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {urlLocationName || urlLocationCode} · {urlLocationType}
              </p>
            </div>
            <button
              type="button"
              onClick={clearLocationFilter}
              className="flex items-center gap-1 rounded-lg border border-primary/30 bg-background px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
            >
              <X className="size-3" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search reports…"
          className="h-10 w-full rounded-xl border border-border bg-card py-2 pl-9 pr-9 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button type="button" onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Status filters */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setStatus(value)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                status === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-card-foreground hover:bg-muted",
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setCategory(value)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                category === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Loading…</span>
          ) : (
            <><span className="font-medium text-foreground">{total.toLocaleString()}</span> reports</>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSpam((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
              showSpam
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}>
            <ShieldAlert className="size-3.5" />
            {showSpam ? "Hiding clean" : "Show spam"}
          </button>

          {hasActiveFilters && (
            <button type="button" onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <X className="size-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <AlertTriangle className="size-5 text-destructive" />
          <p className="text-sm font-medium text-foreground">Failed to load reports</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1.5 text-xs">
            <RefreshCw className="size-3" /> Retry
          </Button>
        </div>
      ) : rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((r) => <ReportRow key={r.id} report={r} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
          <Search className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No reports match</p>
          <p className="text-xs text-muted-foreground">Try different filters</p>
          <button type="button" onClick={clearFilters}
            className="mt-1 text-xs text-primary hover:underline">Clear all filters</button>
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
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — wraps ReportsContent in Suspense so useSearchParams is valid
// ---------------------------------------------------------------------------
export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
