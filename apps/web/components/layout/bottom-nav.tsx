"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Submit", href: "/submit", icon: PlusCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    // Visible only on mobile, sits above content via fixed positioning
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-border bg-background md:hidden">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        // Submit tab gets a highlighted pill style
        const isSubmit = href === "/submit";
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              isSubmit
                ? active
                  ? "text-primary"
                  : "text-muted-foreground"
                : active
                  ? "text-primary"
                  : "text-muted-foreground"
            )}
          >
            {/* Submit tab: floating pill */}
            {isSubmit ? (
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                )}
              >
                <Icon className="size-5" />
              </span>
            ) : (
              <>
                <Icon
                  className={cn(
                    "size-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {/* Active dot */}
                {active && (
                  <span className="absolute top-2 size-1 rounded-full bg-primary" />
                )}
              </>
            )}
            <span className={cn(isSubmit && active ? "-mt-0.5" : "")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
