"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, PlusCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Reports",   href: "/reports",   icon: FileText },
  { label: "Submit",    href: "/submit",    icon: PlusCircle, isSubmit: true },
  { label: "Digests",   href: "/digests",   icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-border bg-background md:hidden">
      {tabs.map(({ label, href, icon: Icon, isSubmit }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isSubmit ? (
              <span className={cn(
                "flex size-10 items-center justify-center rounded-full transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                <Icon className="size-5" />
              </span>
            ) : (
              <>
                <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                {active && <span className="absolute top-2 size-1 rounded-full bg-primary" />}
              </>
            )}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
