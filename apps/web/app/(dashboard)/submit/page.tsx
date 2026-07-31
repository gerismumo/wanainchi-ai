"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Mic, FileText, ImageIcon, Send, Info,
  Camera, X, Loader2, CheckCircle2, RotateCcw, Upload, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateTextReport, useCreateVoiceReport, useCreatePhotoReport } from "@/hooks/useReports";
import { LocationPicker } from "@/components/location-picker";
import type { ResolvedLocation } from "@/components/location-picker";
import { VoiceRecorder } from "@/components/voice-recorder";
import type { ReportLanguage } from "@/types/reports.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
type SubmitType = "text" | "voice" | "photo";

const PRESET_CATEGORIES = [
  "water", "roads", "health", "security",
  "education", "electricity", "sanitation",
];

const LANGUAGES: { value: ReportLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
  { value: "sheng", label: "Sheng" },
];

const TYPE_OPTIONS: {
  value: SubmitType;
  icon: React.ElementType;
  label: string;
  desc: string;
}[] = [
  { value: "text",  icon: FileText,   label: "Text",       desc: "Type in any language" },
  { value: "voice", icon: Mic,        label: "Voice",      desc: "Record or upload audio" },
  { value: "photo", icon: ImageIcon,  label: "Photo",      desc: "Camera or gallery" },
];

// ---------------------------------------------------------------------------
// Photo preview
// ---------------------------------------------------------------------------
function PhotoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = URL.createObjectURL(file);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="preview" className="max-h-64 w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-destructive/10"
      >
        <X className="size-3.5 text-foreground" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
        <p className="truncate text-[11px] text-white/80">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------
function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="relative flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <span className="absolute -right-1 -top-1 flex size-4 animate-ping rounded-full bg-emerald-500/30" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Report received</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Gemma 4 will classify and cluster your report. A community digest is
          generated once enough similar reports arrive in your area.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
        <RotateCcw className="size-3.5" />
        Submit another report
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category picker with custom entry
// ---------------------------------------------------------------------------
function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = value && !PRESET_CATEGORIES.includes(value);

  useEffect(() => {
    if (customMode) inputRef.current?.focus();
  }, [customMode]);

  const commitCustom = () => {
    const trimmed = customInput.trim().toLowerCase();
    if (trimmed) { onChange(trimmed); setCustomMode(false); }
    else setCustomMode(false);
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Category <span className="normal-case font-normal tracking-normal">(optional)</span>
      </p>

      <div className="flex flex-wrap gap-2">
        {PRESET_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(value === c ? "" : c); setCustomMode(false); }}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              value === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-muted",
            )}
          >
            {c}
          </button>
        ))}

        {/* Show custom chip if a non-preset is active */}
        {isCustom && !customMode && (
          <button
            type="button"
            onClick={() => { setCustomInput(value); setCustomMode(true); }}
            className="flex items-center gap-1 rounded-xl border border-primary bg-primary/5 px-3 py-1.5 text-xs font-medium capitalize text-primary"
          >
            {value}
            <X className="size-3" onClick={(e) => { e.stopPropagation(); onChange(""); }} />
          </button>
        )}

        {/* Custom input */}
        {customMode ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitCustom(); }
                if (e.key === "Escape") setCustomMode(false);
              }}
              onBlur={commitCustom}
              placeholder="e.g. corruption"
              maxLength={40}
              className="h-7 w-28 rounded-xl border border-primary bg-card px-2.5 text-xs text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setCustomMode(true); setCustomInput(""); }}
            className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="size-3" /> Other
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SubmitPage() {
  const [type, setType]         = useState<SubmitType>("text");
  const [submitted, setSubmitted] = useState(false);
  const [content, setContent]   = useState("");
  const [language, setLanguage] = useState<ReportLanguage>("en");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createText  = useCreateTextReport();
  const createVoice = useCreateVoiceReport();
  const createPhoto = useCreatePhotoReport();
  const isLoading = createText.isLoading || createVoice.isLoading || createPhoto.isLoading;

  // Auto-detect location on first mount (silent — no toast, just fills the picker)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { kenyaLocations } = await import("ke-locations-data");
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`,
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const candidates = [
            addr.city_district, addr.suburb, addr.neighbourhood,
            addr.quarter, addr.village, addr.town, addr.county,
          ].filter(Boolean) as string[];
          for (const term of candidates) {
            const hits = kenyaLocations.search(term, 3);
            if (hits.length) {
              const best = hits[0]!;
              const i = best.item as unknown as Record<string, string>;
              setLocation({
                location_type: best.type as ResolvedLocation["location_type"],
                location_code: i.code!,
                location_name: i.name!,
                county_code: i.county_code ?? null,
                county_name: i.county_name ?? null,
                constituency_code: i.constituency_code ?? null,
                constituency_name: i.constituency_name ?? null,
                locality_code: best.type === "locality" ? i.code! : (i.locality ?? null),
                locality_name: best.type === "locality" ? i.name! : (i.locality ?? null),
              });
              return;
            }
          }
        } catch { /* silent auto-detect failure */ }
      },
      () => { /* denied — that's fine */ },
      { timeout: 8000 },
    );
  }, []);

  // Camera helpers
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
    } catch {
      toast.error("Camera access denied", {
        description: "Allow camera access in your browser settings.",
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setFile(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
      toast.success("Photo captured");
    }, "image/jpeg", 0.92);
  }, [stopCamera]);

  const handleTypeChange = useCallback((v: SubmitType) => {
    setType(v); setFile(null);
    if (cameraActive) stopCamera();
  }, [cameraActive, stopCamera]);

  // Submit
  const handleSubmit = async () => {
    const locationFields = location
      ? {
          location_type: location.location_type,
          location_code: location.location_code,
        }
      : {};

    if (type === "text") {
      if (content.trim().length < 5) {
        toast.error("Too short", { description: "Write at least 5 characters." });
        return;
      }
      const r = await createText.execute({ content_text: content, language, ...locationFields });
      if (!r.success) { toast.error("Failed to submit", { description: r.message }); return; }
    }

    if (type === "voice") {
      if (!file) { toast.error("No audio", { description: "Record or upload a voice note." }); return; }
      const r = await createVoice.execute(locationFields, file);
      if (!r.success) { toast.error("Failed to submit", { description: r.message }); return; }
    }

    if (type === "photo") {
      if (!file) { toast.error("No photo", { description: "Take or upload a photo." }); return; }
      const r = await createPhoto.execute({ caption: content || undefined, ...locationFields }, file);
      if (!r.success) { toast.error("Failed to submit", { description: r.message }); return; }
    }

    setSubmitted(true);
  };

  const resetForm = () => {
    setSubmitted(false); setContent(""); setFile(null);
    setCategory(""); setLocation(null); setType("text");
  };

  if (submitted) return <SuccessScreen onReset={resetForm} />;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-24 md:pb-10">

      {/* Info banner */}
      <div className="flex gap-2.5 rounded-xl border border-border bg-muted/50 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          No account needed. Your report is linked to this device only — no name or phone number required.
        </p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {TYPE_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleTypeChange(value)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
              type === value
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
            )}
          >
            <Icon className={cn("size-4", type === value ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-xs font-semibold", type === value ? "text-primary" : "text-card-foreground")}>
              {label}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">{desc}</span>
          </button>
        ))}
      </div>

      {/* Category */}
      <CategoryPicker value={category} onChange={setCategory} />

      {/* ---- TEXT ---- */}
      {type === "text" && (
        <div className="space-y-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your message</p>
              <span className={cn("text-[11px] tabular-nums", content.length > 4800 ? "text-destructive" : "text-muted-foreground")}>
                {content.length}/5000
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the issue in as much detail as you can…"
              className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1.5">
            {LANGUAGES.map((l) => (
              <button key={l.value} type="button" onClick={() => setLanguage(l.value)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                  language === l.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- VOICE ---- */}
      {type === "voice" && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Voice note</p>
          <VoiceRecorder file={file} onFile={setFile} onRemove={() => setFile(null)} />
        </div>
      )}

      {/* ---- PHOTO ---- */}
      {type === "photo" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Photo</p>

          {/* Camera view */}
          {cameraActive && (
            <div className="overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline className="aspect-video w-full object-cover" />
              <div className="flex items-center justify-between bg-card px-3 py-2">
                <Button variant="ghost" size="sm" onClick={stopCamera} className="gap-1.5 text-xs">
                  <X className="size-3.5" /> Cancel
                </Button>
                <Button size="sm" onClick={capturePhoto} className="gap-1.5 text-xs">
                  <Camera className="size-3.5" /> Capture
                </Button>
              </div>
            </div>
          )}

          {!cameraActive && file && (
            <PhotoPreview file={file} onRemove={() => setFile(null)} />
          )}

          {!cameraActive && !file && (
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="photo-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/50">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-card-foreground">Upload photo</span>
                <span className="text-[10px] text-muted-foreground">JPG, PNG, WEBP · 15 MB</span>
                <input ref={fileInputRef} id="photo-file" type="file" accept="image/*" className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 15 * 1024 * 1024) { toast.error("Too large", { description: "Max 15 MB." }); return; }
                    setFile(f);
                  }} />
              </label>
              <button type="button" onClick={startCamera}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/50">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Camera className="size-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-card-foreground">Take photo</span>
                <span className="text-[10px] text-muted-foreground">Use your camera</span>
              </button>
            </div>
          )}

          {/* Optional caption */}
          {(file || cameraActive) && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Caption <span className="normal-case font-normal tracking-normal">(optional)</span>
              </p>
              <input type="text" maxLength={500} value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Describe what the photo shows…"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
        </div>
      )}

      {/* Location */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Location <span className="normal-case font-normal tracking-normal">(auto-detected · tap to change)</span>
        </p>
        <LocationPicker value={location} onChange={setLocation} />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          AI will also attempt to detect your location from the report content.
        </p>
      </div>

      {/* Submit */}
      <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="size-4 animate-spin" /> Submitting…</>
        ) : (
          <><Send className="size-4" /> Submit Report</>
        )}
      </Button>
    </div>
  );
}
