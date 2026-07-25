import Link from "next/link";
import { MapPin, ArrowRight, Mic, MessageSquare, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="border-b border-border bg-background px-6 py-20 text-center">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1">
        <span className="size-1.5 rounded-full bg-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Powered by Gemma 4 · Kenya 2027
        </span>
      </div>

      {/* Heading */}
      <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
        Every citizen voice shapes{" "}
        <span className="text-primary">community decisions</span>
      </h1>

      <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
        Submit a concern via voice, text, or photo in English or Kiswahili. AI
        clusters reports, scores urgency, and delivers evidence-backed
        recommendations straight to MPs and county governments.
      </p>

      {/* CTA buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" >
          <Link href="/submit" className="flex flex-row gap-1 flex-nowrap items-center">
            <MapPin className="size-4" />
            Report an Issue
          </Link>
        </Button>
        <Button variant="outline" size="lg" >
          <Link href="/dashboard" className="flex flex-row gap-1 flex-nowrap items-center">
            View Dashboard
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Channel pills */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
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
