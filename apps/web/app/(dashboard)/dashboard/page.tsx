"use client";

import { FileText, Users, TrendingUp, CheckCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CategoryBar, type CategoryItem } from "@/components/dashboard/category-bar";
import { ReportRow } from "@/components/dashboard/report-row";
import { useAnalyticsOverview, useTopCategories } from "@/hooks/useAnalytics";
import { useReports } from "@/hooks/useReports";
import { Button } from "@/components/ui/button";
import type { IReport } from "@/types/reports.types";
import type { ReportRowData } from "@/components/dashboard/report-row";

// ---------------------------------------------------------------------------
// Adapter: IReport → ReportRowData
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
  };
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-7 w-20 rounded bg-muted" />
        </div>
        <div className="size-9 rounded-lg bg-muted" />
      </div>
      <div className="mt-3 h-4 w-32 rounded bg-muted" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="size-8 shrink-0 rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
      <div className="h-3 w-16 rounded bg-muted" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="size-5 text-destructive" />
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 text-xs">
        <RefreshCw className="size-3" /> Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { data: overview, error: overviewError, isLoading: overviewLoading, mutate: retryOverview } = useAnalyticsOverview();
  const { data: categories, error: catError, isLoading: catLoading, mutate: retryCategories } = useTopCategories();
  const { data: reportsData, error: reportsError, isLoading: reportsLoading, mutate: retryReports } = useReports({ page: 1, limit: 8 });

  // ----- Stats -----
  const resolutionRate =
    overview && overview.totalReports > 0
      ? ((overview.resolvedReports / overview.totalReports) * 100).toFixed(1)
      : null;

  const stats = overview
    ? [
        {
          title: "Total Reports",
          value: overview.totalReports.toLocaleString(),
          icon: FileText,
          description: "non-spam submissions",
        },
        {
          title: "Active Counties",
          value: overview.activeCounties.toLocaleString(),
          icon: Users,
          description: "counties with reports",
        },
        {
          title: "Spam Filtered",
          value: overview.spamReports.toLocaleString(),
          icon: TrendingUp,
          description: "auto-flagged by AI",
          changeType: "neutral" as const,
        },
        {
          title: "Resolved",
          value: overview.resolvedReports.toLocaleString(),
          change: resolutionRate ? `${resolutionRate}%` : undefined,
          changeType: "up" as const,
          icon: CheckCircle,
          description: "resolution rate",
        },
      ]
    : null;

  // ----- Categories -----
  const categoryItems: CategoryItem[] = (categories ?? []).slice(0, 8).map((c) => ({
    category: c.category,
    count: c.report_count,
    avgUrgency: c.avg_urgency ?? 0,
  }));

  // ----- Recent reports -----
  const recentRows = (reportsData?.items ?? []).map(toRowData);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {overviewLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : overviewError ? (
        <ErrorBlock message="Could not load overview stats." onRetry={() => retryOverview()} />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatsCard key={s.title} {...s} />
          ))}
        </div>
      ) : null}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Recent reports */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Reports</h2>
            <div className="flex items-center gap-3">
              {reportsLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              <a href="/reports" className="text-xs text-primary hover:underline">
                View all
              </a>
            </div>
          </div>

          {reportsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : reportsError ? (
            <ErrorBlock message="Could not load recent reports." onRetry={() => retryReports()} />
          ) : recentRows.length > 0 ? (
            <div className="space-y-2">
              {recentRows.map((r) => (
                <ReportRow key={r.id} report={r} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 text-center">
              <FileText className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No reports yet</p>
              <p className="text-xs text-muted-foreground">Be the first to submit a report</p>
            </div>
          )}
        </div>

        {/* Category sidebar */}
        {catLoading ? (
          <div className="animate-pulse rounded-xl border border-border bg-card p-5">
            <div className="mb-4 h-4 w-40 rounded bg-muted" />
            <div className="mb-4 h-3 w-full rounded-full bg-muted" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <div className="size-2.5 rounded-sm bg-muted" />
                <div className="h-3 flex-1 rounded bg-muted" />
                <div className="h-3 w-10 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : catError ? (
          <ErrorBlock message="Could not load categories." onRetry={() => retryCategories()} />
        ) : categoryItems.length > 0 ? (
          <CategoryBar data={categoryItems} />
        ) : null}
      </div>
    </div>
  );
}
