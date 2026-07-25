import { cn } from "@/lib/utils";

export interface CategoryItem {
  category: string;
  count: number;
  avgUrgency: number; // 0–1
}

const CATEGORY_COLORS: Record<string, string> = {
  water: "bg-blue-500",
  roads: "bg-orange-500",
  health: "bg-rose-500",
  security: "bg-red-600",
  education: "bg-violet-500",
  electricity: "bg-yellow-500",
  sanitation: "bg-teal-500",
  other: "bg-muted-foreground",
};

function urgencyLabel(score: number) {
  if (score >= 0.75) return { label: "Critical", cls: "text-destructive" };
  if (score >= 0.5) return { label: "High", cls: "text-orange-500" };
  if (score >= 0.25) return { label: "Medium", cls: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Low", cls: "text-muted-foreground" };
}

interface CategoryBarProps {
  data: CategoryItem[];
  className?: string;
}

export function CategoryBar({ data, className }: CategoryBarProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">Reports by Category</h3>
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} total</span>
      </div>

      {/* Stacked bar */}
      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
        {data.map((item) => (
          <div
            key={item.category}
            title={`${item.category}: ${item.count}`}
            style={{ width: `${(item.count / total) * 100}%` }}
            className={cn("h-full transition-all", CATEGORY_COLORS[item.category] ?? "bg-muted-foreground")}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className="space-y-2">
        {data.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          const { label, cls } = urgencyLabel(item.avgUrgency);
          return (
            <div key={item.category} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-sm",
                  CATEGORY_COLORS[item.category] ?? "bg-muted-foreground"
                )}
              />
              <span className="flex-1 text-xs capitalize text-card-foreground">{item.category}</span>
              <span className={cn("text-[11px] font-medium", cls)}>{label}</span>
              <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                {pct}%
              </span>
              <span className="w-10 text-right text-xs tabular-nums text-card-foreground">
                {item.count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
