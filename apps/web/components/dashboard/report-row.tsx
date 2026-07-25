import { MapPin, Mic, FileText, ImageIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type ReportType = "voice" | "text" | "photo";
export type ReportStatus = "received" | "processing" | "reviewed" | "in_progress" | "resolved";
export type ReportSentiment = "positive" | "neutral" | "negative" | "urgent";

export interface ReportRowData {
  id: string;
  type: ReportType;
  category: string;
  summary: string;
  locationName: string;
  status: ReportStatus;
  sentiment: ReportSentiment;
  urgencyScore: number;
  createdAt: string; // ISO string
}

const TYPE_ICONS: Record<ReportType, React.ElementType> = {
  voice: Mic,
  text: FileText,
  photo: ImageIcon,
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  received: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  reviewed: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  in_progress: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  received: "Received",
  processing: "Processing",
  reviewed: "Reviewed",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const SENTIMENT_DOT: Record<ReportSentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground",
  negative: "bg-orange-500",
  urgent: "bg-destructive",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface ReportRowProps {
  report: ReportRowData;
  className?: string;
}

export function ReportRow({ report, className }: ReportRowProps) {
  const TypeIcon = TYPE_ICONS[report.type];

  return (
    <Link
      href={`/reports/${report.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50",
        className
      )}
    >
      {/* Type icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <TypeIcon className="size-3.5 text-muted-foreground" />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold capitalize text-card-foreground">
            {report.category}
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              STATUS_STYLES[report.status]
            )}
          >
            {STATUS_LABELS[report.status]}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{report.summary}</p>
      </div>

      {/* Location */}
      <div className="hidden items-center gap-1 sm:flex">
        <MapPin className="size-3 shrink-0 text-muted-foreground" />
        <span className="max-w-28 truncate text-[11px] text-muted-foreground">
          {report.locationName}
        </span>
      </div>

      {/* Urgency + sentiment */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", SENTIMENT_DOT[report.sentiment])} />
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {Math.round(report.urgencyScore * 100)}%
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{timeAgo(report.createdAt)}</span>
      </div>

      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
