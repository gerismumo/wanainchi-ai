"use client";

import { useState } from "react";
import { ReportRow, type ReportRowData } from "@/components/dashboard/report-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const allReports: ReportRowData[] = [
  {
    id: "rpt-001",
    type: "voice",
    category: "water",
    summary: "Kuna bomba la maji limevunjika karibu na shule ya msingi ya Kangemi",
    locationName: "Kangemi Ward, Nairobi",
    status: "in_progress",
    sentiment: "urgent",
    urgencyScore: 0.91,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "rpt-002",
    type: "photo",
    category: "roads",
    summary: "Deep potholes on Thika Road near Garden City Mall roundabout",
    locationName: "Roysambu, Nairobi",
    status: "reviewed",
    sentiment: "negative",
    urgencyScore: 0.67,
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: "rpt-003",
    type: "text",
    category: "health",
    summary: "Kisumu County Hospital out of malaria test kits for three days",
    locationName: "Kisumu Central",
    status: "processing",
    sentiment: "urgent",
    urgencyScore: 0.87,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "rpt-004",
    type: "text",
    category: "education",
    summary: "Makweni primary school has no desks — students sit on the floor",
    locationName: "Makueni Ward",
    status: "received",
    sentiment: "negative",
    urgencyScore: 0.54,
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
  {
    id: "rpt-005",
    type: "voice",
    category: "electricity",
    summary: "Transformer down 11 days — Kibera Zone C still dark",
    locationName: "Kibera, Nairobi",
    status: "in_progress",
    sentiment: "negative",
    urgencyScore: 0.73,
    createdAt: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
  },
  {
    id: "rpt-006",
    type: "photo",
    category: "sanitation",
    summary: "Open sewer running through residential estate near Kahawa Sukari",
    locationName: "Kahawa, Kiambu",
    status: "resolved",
    sentiment: "negative",
    urgencyScore: 0.62,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "rpt-007",
    type: "text",
    category: "security",
    summary: "Street lights have been off for two weeks — muggings increasing",
    locationName: "Huruma, Nairobi",
    status: "reviewed",
    sentiment: "urgent",
    urgencyScore: 0.84,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: "rpt-008",
    type: "voice",
    category: "water",
    summary: "No clean water for 2 weeks, residents buying from vendors at Ksh 60/jerican",
    locationName: "Mathare, Nairobi",
    status: "in_progress",
    sentiment: "urgent",
    urgencyScore: 0.93,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
];

type StatusFilter = "all" | "received" | "processing" | "reviewed" | "in_progress" | "resolved";
type CategoryFilter = "all" | "water" | "roads" | "health" | "security" | "education" | "electricity" | "sanitation";

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
];

export default function ReportsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = allReports.filter((r) => {
    const matchStatus = status === "all" || r.status === status;
    const matchCategory = category === "all" || r.category === category;
    return matchStatus && matchCategory;
  });

  return (
    <div className="space-y-4">
      {/* Status filter — horizontal scroll on mobile */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                status === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-card-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter — horizontal scroll on mobile */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                category === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
        {allReports.length} reports
      </p>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm font-medium text-foreground">No reports match</p>
          <p className="text-xs text-muted-foreground">Try a different status or category filter</p>
          <button
            onClick={() => { setStatus("all"); setCategory("all"); }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Pagination stub */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">Page 1 of 1</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
