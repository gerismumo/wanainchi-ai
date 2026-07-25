"use client";

import { useState } from "react";
import { Mic, FileText, ImageIcon, MapPin, Send, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SubmitType = "voice" | "text" | "photo";

const CATEGORIES = [
  "water",
  "roads",
  "health",
  "security",
  "education",
  "electricity",
  "sanitation",
  "other",
];

const TYPE_OPTIONS: { value: SubmitType; icon: React.ElementType; label: string; desc: string }[] =
  [
    {
      value: "text",
      icon: FileText,
      label: "Text",
      desc: "Type your report in English or Kiswahili",
    },
    {
      value: "voice",
      icon: Mic,
      label: "Voice note",
      desc: "Upload a voice note from WhatsApp or any app",
    },
    {
      value: "photo",
      icon: ImageIcon,
      label: "Photo",
      desc: "Attach a photo that shows the issue",
    },
  ];

export default function SubmitPage() {
  const [type, setType] = useState<SubmitType>("text");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Send className="size-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Report received</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Gemma 4 will classify and cluster your report. A community digest will
          be generated once enough similar reports arrive in your area.
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Submit another report
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Info banner */}
      <div className="flex gap-2.5 rounded-lg border border-border bg-muted/50 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          You do not need an account. Your report is linked to this device and
          never requires your name or phone number.
        </p>
      </div>

      {/* Submission type */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Report type
        </label>
        <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
          {TYPE_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors xs:flex-col xs:items-start xs:gap-1.5",
                type === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <Icon className={cn("size-4 shrink-0", type === value ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-semibold">{label}</span>
              <span className="hidden text-[10px] leading-tight text-muted-foreground xs:block">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Category
        </label>
        <select
          id="category"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic input area */}
      {type === "text" && (
        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Your message{" "}
            <span className="normal-case tracking-normal font-normal">(English or Kiswahili)</span>
          </label>
          <textarea
            id="content"
            rows={5}
            placeholder="Describe the issue in as much detail as you can…"
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {type === "voice" && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Voice note file
          </label>
          <label
            htmlFor="voice-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <Mic className="size-7 text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">
              Click to upload voice note
            </span>
            <span className="text-xs text-muted-foreground">
              MP3, M4A, OGG, OPUS · Max 10 MB
            </span>
            <input id="voice-file" type="file" accept="audio/*" className="sr-only" />
          </label>
        </div>
      )}

      {type === "photo" && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Photo
          </label>
          <label
            htmlFor="photo-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <ImageIcon className="size-7 text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">
              Click to upload a photo
            </span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG, WEBP · Max 20 MB
            </span>
            <input id="photo-file" type="file" accept="image/*" className="sr-only" />
          </label>
        </div>
      )}

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Location <span className="normal-case tracking-normal font-normal">(optional)</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="location"
            type="text"
            placeholder="e.g. Kangemi Ward, Westlands"
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          AI will also attempt to detect your location from the report content.
        </p>
      </div>

      {/* Submit */}
      <Button className="w-full" size="lg" onClick={() => setSubmitted(true)}>
        <Send className="size-4" />
        Submit Report
      </Button>
    </div>
  );
}
