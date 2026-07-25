import { ReportRow, type ReportRowData } from "@/components/dashboard/report-row";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock data — all report statuses represented
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

const STATUS_FILTERS = ["All", "received", "processing", "reviewed", "in_progress", "resolved"];
const CATEGORY_FILTERS = ["All", "water", "roads", "health", "security", "education", "electricity", "sanitation"];

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-card-foreground transition-colors first:bg-primary first:text-primary-foreground hover:bg-muted"
            >
              {s === "All" ? s : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.slice(1).map((c) => (
            <button
              key={c}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium capitalize text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{allReports.length}</span> reports
      </p>

      {/* List */}
      <div className="space-y-2">
        {allReports.map((r) => (
          <ReportRow key={r.id} report={r} />
        ))}
      </div>

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
