import { FileText, Users, TrendingUp, CheckCircle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CategoryBar, type CategoryItem } from "@/components/dashboard/category-bar";
import { ReportRow, type ReportRowData } from "@/components/dashboard/report-row";

// ---------------------------------------------------------------------------
// Mock data — replace with real API calls once the backend is wired up
// ---------------------------------------------------------------------------
const stats = [
  {
    title: "Total Reports",
    value: "12,483",
    change: "+8.2%",
    changeType: "up" as const,
    icon: FileText,
    description: "vs. last 30 days",
  },
  {
    title: "Active Citizens",
    value: "4,291",
    change: "+12%",
    changeType: "up" as const,
    icon: Users,
    description: "unique devices",
  },
  {
    title: "Avg. Urgency",
    value: "0.63",
    change: "High",
    changeType: "down" as const,
    icon: TrendingUp,
    description: "community priority",
  },
  {
    title: "Resolved",
    value: "1,847",
    change: "14.8%",
    changeType: "neutral" as const,
    icon: CheckCircle,
    description: "resolution rate",
  },
];

const categories: CategoryItem[] = [
  { category: "water", count: 3120, avgUrgency: 0.82 },
  { category: "roads", count: 2540, avgUrgency: 0.65 },
  { category: "health", count: 1980, avgUrgency: 0.71 },
  { category: "security", count: 1450, avgUrgency: 0.88 },
  { category: "education", count: 1230, avgUrgency: 0.48 },
  { category: "electricity", count: 980, avgUrgency: 0.59 },
  { category: "sanitation", count: 760, avgUrgency: 0.55 },
  { category: "other", count: 423, avgUrgency: 0.3 },
];

const recentReports: ReportRowData[] = [
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
    summary: "Deep potholes on Thika Road near the Garden City Mall roundabout",
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
    summary: "Kisumu County Hospital has run out of malaria test kits for three days",
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
    summary: "Transformer has been down for 11 days — Kibera Zone C still dark",
    locationName: "Kibera, Nairobi",
    status: "in_progress",
    sentiment: "negative",
    urgencyScore: 0.73,
    createdAt: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
  },
];

// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} {...s} />
        ))}
      </div>

      {/* Category breakdown + recent reports */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Recent reports list */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Reports</h2>
            <a href="/reports" className="text-xs text-primary hover:underline">
              View all
            </a>
          </div>
          <div className="space-y-2">
            {recentReports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        </div>

        {/* Category sidebar */}
        <CategoryBar data={categories} />
      </div>
    </div>
  );
}
