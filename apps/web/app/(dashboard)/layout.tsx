import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar: desktop only (hidden on mobile via sidebar.tsx) */}
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* pb-16 on mobile gives clearance for the fixed BottomNav */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom tab bar: mobile only */}
      <BottomNav />
    </div>
  );
}
