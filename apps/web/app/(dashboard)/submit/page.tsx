"use client";

import { useRef, useState, useCallback } from "react";
import {
  Mic, FileText, ImageIcon, MapPin, Send, Info,
  Camera, X, Loader2, CheckCircle2, RotateCcw, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateTextReport, useCreateVoiceReport, useCreatePhotoReport } from "@/hooks/useReports";
import type { ReportLanguage } from "@/types/reports.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
type SubmitType = "text" | "voice" | "photo";

const CATEGORIES = [
  "water", "roads", "health", "security",
  "education", "electricity", "sanitation", "other",
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
  { value: "text", icon: FileText, label: "Text", desc: "Type in English or Kiswahili" },
  { value: "voice", icon: Mic, label: "Voice note", desc: "Upload audio from any app" },
  { value: "photo", icon: ImageIcon, label: "Photo", desc: "Attach or take a photo" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function FilePreview({
  file, onRemove,
}: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const url = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="preview" className="size-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
          <Mic className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-card-foreground">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {(file.size / 1024 / 1024).toFixed(1)} MB
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-destructive/10"
        aria-label="Remove file"
      >
        <X className="size-3 text-muted-foreground" />
      </button>
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
// Main page
// ---------------------------------------------------------------------------
export default function SubmitPage() {
  const [type, setType] = useState<SubmitType>("text");
  const [submitted, setSubmitted] = useState(false);

  // Text fields
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<ReportLanguage>("en");
  const [category, setCategory] = useState("");

  // Location
  const [locationCode, setLocationCode] = useState("");
  const [detectingGeo, setDetectingGeo] = useState(false);
  const [geoLabel, setGeoLabel] = useState<string | null>(null);

  // File / camera
  const [file, setFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const createText = useCreateTextReport();
  const createVoice = useCreateVoiceReport();
  const createPhoto = useCreatePhotoReport();

  const isLoading = createText.isLoading || createVoice.isLoading || createPhoto.isLoading;

  // ----- geo detection -----
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.warning("Geolocation is not supported by your browser");
      return;
    }
    setDetectingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse-geocode with a free API to get a human-readable label
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const suburb =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.village ||
            data.address?.county ||
            "";
          const city = data.address?.city || data.address?.town || "";
          setGeoLabel([suburb, city].filter(Boolean).join(", ") || "Location detected");
          setLocationCode(`${latitude.toFixed(5)},${longitude.toFixed(5)}`);
        } catch {
          setGeoLabel("Location detected");
          setLocationCode(`${latitude.toFixed(5)},${longitude.toFixed(5)}`);
        }
        setDetectingGeo(false);
        toast.success("Location detected");
      },
      (err) => {
        setDetectingGeo(false);
        toast.error("Could not detect location", { description: err.message });
      },
      { timeout: 10_000 }
    );
  }, []);

  // ----- camera -----
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Attach after state updates paint the <video>
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      toast.error("Camera access denied", {
        description: "Please allow camera access in your browser settings.",
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
      const captured = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(captured);
      stopCamera();
      toast.success("Photo captured");
    }, "image/jpeg", 0.92);
  }, [stopCamera]);

  // ----- type switch — clear file & stop camera -----
  const handleTypeChange = useCallback((v: SubmitType) => {
    setType(v);
    setFile(null);
    if (cameraActive) stopCamera();
  }, [cameraActive, stopCamera]);

  // ----- submit -----
  const handleSubmit = async () => {
    if (type === "text") {
      if (content.trim().length < 5) {
        toast.error("Report too short", { description: "Please write at least 5 characters." });
        return;
      }
      const result = await createText.execute({ content_text: content, language });
      if (!result.success) {
        toast.error("Failed to submit report", { description: result.message });
        return;
      }
    }

    if (type === "voice") {
      if (!file) {
        toast.error("No file selected", { description: "Please upload a voice note." });
        return;
      }
      const result = await createVoice.execute({}, file);
      if (!result.success) {
        toast.error("Failed to submit voice report", { description: result.message });
        return;
      }
    }

    if (type === "photo") {
      if (!file) {
        toast.error("No photo selected", { description: "Please upload or take a photo." });
        return;
      }
      const result = await createPhoto.execute({ caption: content || undefined }, file);
      if (!result.success) {
        toast.error("Failed to submit photo report", { description: result.message });
        return;
      }
    }

    setSubmitted(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setContent("");
    setFile(null);
    setCategory("");
    setLocationCode("");
    setGeoLabel(null);
    setType("text");
  };

  if (submitted) return <SuccessScreen onReset={resetForm} />;

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-10">
      {/* Info banner */}
      <div className="flex gap-2.5 rounded-lg border border-border bg-muted/50 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          No account needed. Your report is linked to this device — your name and phone
          number are never required.
        </p>
      </div>

      {/* Report type */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Report type
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors",
                type === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <Icon className={cn("size-4 shrink-0", type === value ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Category <span className="normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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

      {/* ---- TEXT ---- */}
      {type === "text" && (
        <div className="space-y-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="content" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Your message
              </label>
              <span className={cn("text-[11px] tabular-nums", content.length > 4800 ? "text-destructive" : "text-muted-foreground")}>
                {content.length}/5000
              </span>
            </div>
            <textarea
              id="content"
              rows={5}
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the issue in as much detail as you can…"
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Language */}
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLanguage(l.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  language === l.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- VOICE ---- */}
      {type === "voice" && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Voice note file
          </p>
          {file ? (
            <FilePreview file={file} onRemove={() => setFile(null)} />
          ) : (
            <label
              htmlFor="voice-file"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Mic className="size-5 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-card-foreground">
                  Click to upload voice note
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  MP3, M4A, OGG, OPUS, WAV · Max 15 MB
                </p>
              </div>
              <input
                ref={voiceInputRef}
                id="voice-file"
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 15 * 1024 * 1024) {
                    toast.error("File too large", { description: "Maximum size is 15 MB." });
                    return;
                  }
                  setFile(f);
                }}
              />
            </label>
          )}
        </div>
      )}

      {/* ---- PHOTO ---- */}
      {type === "photo" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Photo
          </p>

          {/* Camera view */}
          {cameraActive && (
            <div className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center justify-between bg-card p-3">
                <Button variant="ghost" size="sm" onClick={stopCamera} className="gap-1.5 text-xs">
                  <X className="size-3.5" /> Cancel
                </Button>
                <Button size="sm" onClick={capturePhoto} className="gap-1.5 text-xs">
                  <Camera className="size-3.5" /> Capture
                </Button>
              </div>
            </div>
          )}

          {/* File preview */}
          {!cameraActive && file && (
            <FilePreview file={file} onRemove={() => setFile(null)} />
          )}

          {/* Upload / camera buttons */}
          {!cameraActive && !file && (
            <div className="grid grid-cols-2 gap-3">
              <label
                htmlFor="photo-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium text-card-foreground">Upload photo</span>
                <span className="text-[10px] text-muted-foreground">JPG, PNG, WEBP · 15 MB</span>
                <input
                  ref={fileInputRef}
                  id="photo-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 15 * 1024 * 1024) {
                      toast.error("File too large", { description: "Maximum size is 15 MB." });
                      return;
                    }
                    setFile(f);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <Camera className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium text-card-foreground">Take photo</span>
                <span className="text-[10px] text-muted-foreground">Use your camera</span>
              </button>
            </div>
          )}

          {/* Optional caption */}
          <div>
            <label htmlFor="caption" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Caption <span className="normal-case font-normal tracking-normal">(optional)</span>
            </label>
            <input
              id="caption"
              type="text"
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what the photo shows…"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {/* Location */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Location <span className="normal-case font-normal tracking-normal">(optional)</span>
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={geoLabel ?? locationCode}
              onChange={(e) => { setLocationCode(e.target.value); setGeoLabel(null); }}
              placeholder="e.g. Kangemi Ward, Westlands"
              className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectLocation}
            disabled={detectingGeo}
            className="shrink-0 gap-1.5 text-xs"
          >
            {detectingGeo ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MapPin className="size-3.5" />
            )}
            {detectingGeo ? "Detecting…" : "Detect"}
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          AI will also attempt to detect your location from the report content.
        </p>
      </div>

      {/* Submit */}
      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="size-4" />
            Submit Report
          </>
        )}
      </Button>
    </div>
  );
}
