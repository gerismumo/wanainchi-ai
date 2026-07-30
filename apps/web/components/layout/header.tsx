'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Overview of citizen reports and community priorities',
  },
  '/reports': {
    title: 'Reports',
    description: 'Browse and filter all submitted citizen reports',
  },
  '/submit': {
    title: 'Submit Report',
    description: 'Share your community concern — voice, text, or photo',
  },
  '/digests': {
    title: 'AI Digests',
    description: 'AI-generated summaries of community priorities by location',
  },
};

export function Header() {
  const pathname = usePathname();
  const page = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(
      ([key]) => pathname === key || pathname.startsWith(key + '/'),
    )?.[1] ?? { title: 'WananchiAI', description: '' };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      {/* Page title */}
      <div className="leading-tight">
        <h1 className="text-sm font-semibold text-foreground">{page.title}</h1>
        {page.description && (
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            {page.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <ModeToggle />
        {/* Only show on desktop — bottom nav handles it on mobile */}
        <Button size="sm" className="hidden md:inline-flex">
          <Link href="/submit">+ Submit</Link>
        </Button>
      </div>
    </header>
  );
}
