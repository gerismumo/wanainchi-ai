import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <MapPin className="size-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">WananchiAI</span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          {/* Dashboard link: text on sm+, icon-only implicitly hidden when space is tight */}
          <div className="hidden sm:inline-flex">
            <Button variant="outline" size="sm">
              <Link href="/dashboard" className="hidden sm:inline-flex">
                Dashboard
              </Link>
            </Button>
          </div>

          <Button size="sm">
            <Link href="/submit" className="flex items-center gap-1.5">
              <span className="hidden xs:inline">Report Issue</span>
              <span className="inline xs:hidden">Report</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Page sections */}
      <Hero />
      <Features />
      <HowItWorks />
      {/* CTA section */}
      <section className="border-b border-border bg-muted/30 px-4 py-12 text-center sm:px-6 sm:py-16">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Kenya 2027 Elections
        </p>
        <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Shift public participation from promises to data
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Every report submitted today becomes part of the evidence base that
          holds leaders accountable. Your voice is the data.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg">
            <Link href="/submit" className="flex items-center gap-2">
              <MapPin className="size-4" />
              Submit Your First Report
            </Link>
          </Button>
          <Button variant="outline" size="lg">
            <Link href="/dashboard">Explore the Dashboard</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-3 border-t border-border px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary">
            <MapPin className="size-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            WananchiAI
          </span>
          <span className="text-xs text-muted-foreground">
            · Civic Intelligence Platform
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Powered by Gemma 4 · Built for Kenya
        </p>
      </footer>
    </div>
  );
}
