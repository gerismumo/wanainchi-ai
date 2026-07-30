"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, MapPin, Calendar, FileText,
  AlertTriangle, RefreshCw, TrendingUp, BarChart3,
  Clock, Hash, Copy, CheckCheck, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { useDigest } from "@/hooks/useDigests";
import type { DigestTopIssue, IAiDigest } from "@/types/digests.types";
import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatPeriod(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const s = new Date(start).toLocaleDateString("en-KE", opts);
  const e = new Date(end).toLocaleDateString("en-KE", opts);
  return `${s} – ${e}`;
}

function periodDays(start: string, end: string) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1;
}

function urgencyLabel(score: number): { label: string; color: string; bar: string } {
  if (score >= 0.75) return { label: "Critical", color: "text-destructive",  bar: "bg-destructive" };
  if (score >= 0.5)  return { label: "High",     color: "text-orange-500",   bar: "bg-orange-500" };
  if (score >= 0.25) return { label: "Medium",   color: "text-yellow-500",   bar: "bg-yellow-500" };
  return               { label: "Low",      color: "text-emerald-500",  bar: "bg-emerald-500" };
}

const CATEGORY_COLORS: Record<string, string> = {
  water:       "bg-blue-500",
  roads:       "bg-orange-500",
  health:      "bg-rose-500",
  security:    "bg-red-600",
  education:   "bg-violet-500",
  electricity: "bg-yellow-500",
  sanitation:  "bg-teal-500",
  environment: "bg-green-600",
  agriculture: "bg-lime-600",
  governance:  "bg-slate-500",
  other:       "bg-muted-foreground",
};

// ---------------------------------------------------------------------------
// Copy hook
// ---------------------------------------------------------------------------
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return { copied, copy };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="size-11 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-5 w-56 rounded bg-muted" />
          </div>
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-3 rounded bg-muted" style={{ width: `${100 - i * 10}%` }} />)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl border border-border bg-card" />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div>
        <p className="font-medium text-foreground">Digest not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This digest may have been removed or the link is invalid.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Retry
        </Button>
        <Link href="/digests" className={cn(buttonVariants({ size: "sm" }))}>
          Back to digests
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------
function StatTile({
  icon: Icon, label, value, sub, color = "text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", color)} />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top issues chart
// ---------------------------------------------------------------------------
function TopIssuesChart({ issues }: { issues: DigestTopIssue[] }) {
  if (!issues.length) return null;
  const maxCount = Math.max(...issues.map((i) => i.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-card-foreground">Top Issues</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">{issues.length} categories</span>
      </div>

      {/* Stacked bar */}
      <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {issues.map((issue) => (
          <div
            key={issue.category}
            title={`${issue.category}: ${issue.count}`}
            style={{ width: `${(issue.count / issues.reduce((s, i) => s + i.count, 0)) * 100}%` }}
            className={cn("h-full transition-all", CATEGORY_COLORS[issue.category] ?? "bg-muted-foreground")}
          />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {issues.map((issue) => {
          const pct = Math.round((issue.count / issues.reduce((s, i) => s + i.count, 0)) * 100);
          const urg = urgencyLabel(issue.avg_urgency);
          return (
            <div key={issue.category} className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={cn("size-2.5 shrink-0 rounded-sm", CATEGORY_COLORS[issue.category] ?? "bg-muted-foreground")} />
                <span className="flex-1 text-xs font-medium capitalize text-card-foreground">{issue.category}</span>
                <span className={cn("text-[11px] font-semibold", urg.color)}>{urg.label}</span>
                <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                <span className="w-10 text-right text-xs tabular-nums font-semibold text-card-foreground">
                  {issue.count.toLocaleString()}
                </span>
              </div>
              {/* Urgency bar */}
              <div className="ml-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", urg.bar)}
                  style={{ width: `${(issue.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DigestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: digest, error, isLoading, mutate } = useDigest(id);
  const { copied, copy } = useCopy();

  if (isLoading) return <Skeleton />;
  if (error || !digest) return <ErrorState onRetry={() => mutate()} />;

  const locationParts = [
    digest.location_name,
    digest.constituency_name,
    digest.county_name,
  ].filter(Boolean) as string[];

  const days = periodDays(digest.period_start, digest.period_end);
  const topIssues = digest.top_issues ?? [];

  // Highest-urgency issue
  const topUrgency = topIssues.length
    ? Math.max(...topIssues.map((i) => i.avg_urgency))
    : null;
  const urgInfo = topUrgency != null ? urgencyLabel(topUrgency) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">

      {/* Back */}
      <Link
        href="/digests"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to digests
      </Link>

      {/* ── Hero card ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">

        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">AI Digest</p>
              <p className="font-semibold text-foreground">
                {formatPeriod(digest.period_start, digest.period_end)}
              </p>
            </div>
          </div>

          {/* Report count badge */}
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-card-foreground">
            <FileText className="size-3.5" />
            {digest.report_count.toLocaleString()} reports
          </span>
        </div>

        {/* Location pills */}
        {locationParts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {locationParts.map((part) => (
              <span key={part}
                className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-2.5 py-1 text-xs text-card-foreground">
                <MapPin className="size-3 text-muted-foreground" />
                {part}
              </span>
            ))}
            {digest.location_type && (
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                {digest.location_type}
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              AI Summary
            </p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{digest.summary_text}</p>
        </div>

        {/* Copy ID */}
        <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={() => { copy(digest.id); toast.success("Digest ID copied"); }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <CheckCheck className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy ID"}
          </button>
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={FileText}
          label="Reports"
          value={digest.report_count.toLocaleString()}
          sub="analysed by AI"
          color="text-primary"
        />
        <StatTile
          icon={Calendar}
          label="Period"
          value={`${days}d`}
          sub={`${formatDate(digest.period_start)} →`}
        />
        <StatTile
          icon={TrendingUp}
          label="Top urgency"
          value={urgInfo ? `${Math.round((topUrgency ?? 0) * 100)}%` : "—"}
          sub={urgInfo?.label}
          color={urgInfo?.color ?? "text-muted-foreground"}
        />
      </div>

      {/* ── Top issues chart ── */}
      {topIssues.length > 0 && <TopIssuesChart issues={topIssues} />}

      {/* ── Browse reports for this location ── */}
      {digest.location_code && digest.location_type && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Explore
          </p>
          <Link
            href={`/reports?location_type=${digest.location_type}&location_code=${digest.location_code}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 transition-colors hover:bg-muted"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">
                Browse reports from {digest.location_name ?? "this location"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Filter the full report feed for this {digest.location_type}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* ── Metadata ── */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Metadata
        </p>
        <dl className="space-y-2">
          {[
            { icon: Calendar, label: "Period start", value: formatDate(digest.period_start) },
            { icon: Calendar, label: "Period end",   value: formatDate(digest.period_end) },
            { icon: Clock,    label: "Generated",    value: formatDate(digest.created_at) },
            { icon: Hash,     label: "Digest ID",    value: digest.id },
            ...(digest.location_type
              ? [{ icon: MapPin, label: "Level", value: digest.location_type }]
              : []),
            ...(digest.location_code
              ? [{ icon: Hash, label: "Location code", value: digest.location_code }]
              : []),
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <dt className="w-28 shrink-0 text-xs text-muted-foreground">{label}</dt>
              <dd className="break-all text-xs font-medium text-card-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

    </div>
  );
}
