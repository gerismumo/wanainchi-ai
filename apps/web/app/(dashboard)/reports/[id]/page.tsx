"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Mic, FileText, ImageIcon,
  ThumbsUp, AlertTriangle, RefreshCw, Loader2,
  Calendar, Clock, Globe, Hash, Copy, CheckCheck,
  TrendingUp, ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { useReport } from "@/hooks/useReports";
import { useToggleVote } from "@/hooks/useVotes";
import type { IReport, ReportSentiment, ReportStatus, ReportType } from "@/types/reports.types";

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------
const TYPE_ICONS: Record<ReportType, React.ElementType> = {
  voice: Mic, text: FileText, photo: ImageIcon,
};

const TYPE_LABELS: Record<ReportType, string> = {
  voice: "Voice note", text: "Text report", photo: "Photo report",
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  received:    "bg-muted text-muted-foreground border-border",
  processing:  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  reviewed:    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  in_progress: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  resolved:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  received: "Received", processing: "Processing", reviewed: "Reviewed",
  in_progress: "In Progress", resolved: "Resolved",
};

const SENTIMENT_CONFIG: Record<ReportSentiment, { label: string; dot: string; bar: string }> = {
  positive: { label: "Positive",  dot: "bg-emerald-500", bar: "bg-emerald-500" },
  neutral:  { label: "Neutral",   dot: "bg-muted-foreground", bar: "bg-muted-foreground" },
  negative: { label: "Negative",  dot: "bg-orange-500", bar: "bg-orange-500" },
  urgent:   { label: "Urgent",    dot: "bg-destructive", bar: "bg-destructive" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

function buildLocationParts(r: IReport): string[] {
  return [
    r.location_name,
    r.locality_name,
    r.constituency_name,
    r.county_name,
  ].filter(Boolean) as string[];
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
          <div className="h-6 w-24 rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
          <div className="h-3 w-4/6 rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div>
        <p className="font-medium text-foreground">Report not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This report may have been removed or the link is invalid.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Retry
        </Button>
        <Link
          href="/reports"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Back to reports
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vote button — optimistic counter
// ---------------------------------------------------------------------------
function VoteButton({
  reportId, initialCount, onVoted,
}: { reportId: string; initialCount: number; onVoted: () => void }) {
  const { execute, isLoading } = useToggleVote();
  const [localCount, setLocalCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);

  const handleVote = useCallback(async () => {
    // Optimistic update
    const next = voted ? localCount - 1 : localCount + 1;
    setLocalCount(next);
    setVoted((v) => !v);

    const result = await execute(reportId);
    if (!result.success) {
      // Rollback
      setLocalCount(localCount);
      setVoted((v) => !v);
      toast.error("Could not record vote", { description: result.message });
    } else {
      // Sync server count
      if (result.data) setLocalCount(result.data.vote_count);
      onVoted();
      toast.success(result.data?.voted ? "Vote recorded" : "Vote removed");
    }
  }, [voted, localCount, reportId, execute, onVoted]);

  return (
    <button
      type="button"
      onClick={handleVote}
      disabled={isLoading}
      className={cn(
        "group flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all",
        voted
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
      )}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ThumbsUp className={cn("size-4 transition-transform group-active:scale-90", voted && "fill-current")} />
      )}
      <span className="tabular-nums">{localCount}</span>
      <span className="text-xs opacity-70">{localCount === 1 ? "vote" : "votes"}</span>
    </button>
  );
}


// ---------------------------------------------------------------------------
// Copy-to-clipboard mini hook
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
// Stat tile
// ---------------------------------------------------------------------------
function StatTile({
  icon: Icon, label, value, sub, color = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", color)} />
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn("text-xl font-semibold tabular-nums", color)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: report, error, isLoading, mutate } = useReport(id);
  const { copied, copy } = useCopy();

  if (isLoading) return <Skeleton />;
  if (error || !report) return <ErrorState onRetry={() => mutate()} />;

  const TypeIcon = TYPE_ICONS[report.type];
  const locationParts = buildLocationParts(report);
  const sentiment = report.sentiment ?? "neutral";
  const sentimentCfg = SENTIMENT_CONFIG[sentiment];
  const urgencyPct = report.urgency_score != null ? Math.round(report.urgency_score * 100) : null;
  const confidencePct = report.confidence_score != null ? Math.round(report.confidence_score * 100) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">

      {/* Back breadcrumb */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to reports
      </Link>

      {/* Spam banner */}
      {report.is_spam && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="text-xs font-semibold text-destructive">Flagged as spam</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This report was automatically classified as spam by the AI{report.spam_score != null ? ` (score: ${Math.round(report.spam_score * 100)}%)` : ""}. It is not shown in public feeds.
            </p>
          </div>
        </div>
      )}

      {/* ---- Hero card ---- */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Type badge */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <TypeIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[report.type]}</p>
              <p className="mt-0.5 font-semibold capitalize text-foreground">
                {report.category ?? "Uncategorised"}
              </p>
            </div>
          </div>

          {/* Status pill */}
          {/* <span className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            STATUS_STYLES[report.status]
          )}>
            {STATUS_LABELS[report.status]}
          </span> */}
        </div>

        {/* AI summary */}
        {report.summary && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              AI Summary
            </p>
            <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
          </div>
        )}

        {/* Full text content */}
        {report.content_text && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Original report
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
              {report.content_text}
            </p>
          </div>
        )}

        {/* Photo */}
        {report.type === "photo" && report.media_url && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.media_url}
              alt="Report photo"
              className="max-h-[480px] w-full cursor-zoom-in object-contain bg-muted"
              onClick={() => window.open(report.media_url!, "_blank")}
            />
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
              <span className="text-[11px] text-muted-foreground">Tap image to open full size</span>
              <a href={report.media_url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline">Open ↗</a>
            </div>
          </div>
        )}

        {/* Voice note — inline audio player */}
        {report.type === "voice" && report.media_url && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Mic className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-card-foreground">Voice note</p>
                <p className="text-[11px] text-muted-foreground">Submitted audio recording</p>
              </div>
            </div>
            {/* Native audio element — works on all mobile browsers */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              controls
              preload="metadata"
              className="w-full rounded-lg"
              src={report.media_url}
            />
          </div>
        )}

        {/* Language */}
        {report.language && report.language !== "en" && (
          <div className="mt-3 flex items-center gap-1.5">
            <Globe className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground capitalize">
              Language: {report.language === "sw" ? "Kiswahili" : report.language}
            </span>
          </div>
        )}

        {/* Vote + share row */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <VoteButton
            reportId={report.id}
            initialCount={report.vote_count}
            onVoted={() => mutate()}
          />

    

          {/* Copy ID */}
          <button
            type="button"
            onClick={() => { copy(report.id); toast.success("Report ID copied"); }}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <CheckCheck className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy ID"}
          </button>
        </div>
      </div>

      {/* ---- Stat tiles ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={TrendingUp}
          label="Urgency"
          value={urgencyPct != null ? `${urgencyPct}%` : "—"}
          sub={urgencyPct != null ? (urgencyPct >= 75 ? "Critical" : urgencyPct >= 50 ? "High" : "Medium") : undefined}
          color={
            urgencyPct == null ? "text-muted-foreground"
              : urgencyPct >= 75 ? "text-destructive"
              : urgencyPct >= 50 ? "text-orange-500"
              : "text-yellow-500"
          }
        />
        <StatTile
          icon={ShieldAlert}
          label="Confidence"
          value={confidencePct != null ? `${confidencePct}%` : "—"}
          sub="AI classification"
          color="text-primary"
        />
        <StatTile
          icon={ThumbsUp}
          label="Votes"
          value={report.vote_count.toLocaleString()}
          sub="community support"
          color="text-emerald-500"
        />
      </div>

      {/* ---- Sentiment bar ---- */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sentiment
          </p>
          <div className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", sentimentCfg.dot)} />
            <span className="text-xs font-medium text-card-foreground">{sentimentCfg.label}</span>
          </div>
        </div>
        {urgencyPct != null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-700", sentimentCfg.bar)}
              style={{ width: `${urgencyPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ---- Location ---- */}
      {locationParts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Location
          </p>
          <div className="flex flex-wrap gap-2">
            {locationParts.map((part) => (
              <span
                key={part}
                className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs text-card-foreground"
              >
                <MapPin className="size-3 text-muted-foreground" />
                {part}
              </span>
            ))}
          </div>
          {report.latitude != null && report.longitude != null && (
            <a
              href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <MapPin className="size-3" />
              View on Google Maps
            </a>
          )}
        </div>
      )}

      {/* ---- Meta ---- */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Metadata
        </p>
        <dl className="space-y-2">
          {[
            { icon: Calendar, label: "Submitted", value: formatDate(report.created_at) },
            { icon: Clock,    label: "Time",      value: `${formatTime(report.created_at)} · ${timeAgo(report.created_at)}` },
            { icon: Hash,     label: "Report ID", value: report.id },
            ...(report.location_type ? [{ icon: Globe, label: "Location type", value: report.location_type }] : []),
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <dt className="w-24 shrink-0 text-xs text-muted-foreground">{label}</dt>
              <dd className="break-all text-xs font-medium text-card-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ---- Duplicate notice ---- */}
      {report.duplicate_of && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-500" />
          <div>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              Marked as duplicate
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This report was linked to{" "}
              <Link
                href={`/reports/${report.duplicate_of}`}
                className="text-primary hover:underline"
              >
                an earlier report
              </Link>
              . It is still counted in community stats.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
