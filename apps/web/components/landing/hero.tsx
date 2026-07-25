import Link from "next/link";
import { MapPin, ArrowRight, Mic, MessageSquare, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="border-b border-border bg-background px-4 py-14 text-center sm:px-6 sm:py-20">
      {/* Badge */}
      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1">
        <span className="size-1.5 rounded-full bg-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Powered by Gemma 4 · Kenya 2027
        </span>
      </div>

      {/* Heading */}
      <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        Every citizen voice shapes{" "}
        <span className="text-primary">community decisions</span>
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:mt-5 sm:text-base">
        Submit a concern via voice, text, or photo in English or Kiswahili. AI
        clusters reports, scores urgency, and delivers evidence-backed
        recommendations straight to MPs and county governments.
      </p>

      {/* CTA buttons — stack on mobile, row on sm+ */}
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
        <Button size="lg"  className="w-full sm:w-auto">
          <Link href="/submit" className="flex items-center justify-center gap-2">
            <MapPin className="size-4" />
            Report an Issue
          </Link>
        </Button>
        <Button variant="outline" size="lg"  className="w-full sm:w-auto">
          <Link href="/dashboard" className="flex items-center justify-center gap-2">
            View Dashboard
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Channel pills — wraps on mobile, row on sm+ */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {[
          { icon: Mic, label: "Voice Note" },
          { icon: MessageSquare, label: "SMS / Text" },
          { icon: Image, label: "Photo" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5"
          >
            <Icon className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-card-foreground">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
          <span className="text-xs font-semibold text-primary">EN</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-primary">SW</span>
          <span className="text-xs font-medium text-card-foreground">Bilingual</span>
        </div>
      </div>
    </section>
  );
}
