"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Upload, Square, Trash2, Play, Pause, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Animated waveform bars (purely decorative)
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className={cn(
            "w-[3px] rounded-full bg-primary transition-all",
            active ? "animate-[waveBar_0.8s_ease-in-out_infinite_alternate]" : "h-1",
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface VoiceRecorderProps {
  onFile: (file: File) => void;
  onRemove: () => void;
  file: File | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function VoiceRecorder({ onFile, onRemove, file }: VoiceRecorderProps) {
  const [mode, setMode] = useState<"idle" | "recording" | "recorded">(
    file ? "recorded" : "idle",
  );
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Sync mode when file is cleared externally
  useEffect(() => {
    if (!file && mode === "recorded") {
      setMode("idle");
      setDuration(0);
    }
  }, [file, mode]);

  // ---- Start recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer webm/opus, fall back to whatever the browser supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = recorder.mimeType?.includes("ogg") ? "ogg" : "webm";
        const recorded = new File([blob], `recording-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(blob);
        onFile(recorded);
        setMode("recorded");
      };

      recorder.start(100); // collect data every 100ms
      setMode("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= 5 * 60) { stopRecording(); return d; } // 5 min cap
          return d + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied", {
        description: "Allow microphone access in your browser settings.",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Stop recording ----
  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ---- Play / pause preview ----
  const togglePlay = useCallback(() => {
    if (!file) return;
    if (!audioRef.current) {
      if (!objectUrlRef.current) objectUrlRef.current = URL.createObjectURL(file);
      audioRef.current = new Audio(objectUrlRef.current);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => toast.error("Cannot play audio"));
      setPlaying(true);
    }
  }, [file, playing]);

  // ---- Remove ----
  const handleRemove = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setPlaying(false);
    setDuration(0);
    setMode("idle");
    onRemove();
  }, [onRemove]);

  // ---- Upload file ----
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum voice note size is 15 MB." });
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(f);
    onFile(f);
    setMode("recorded");
    setDuration(0);
  }, [onFile]);

  // ---- Idle state ----
  if (mode === "idle") {
    return (
      <div className="space-y-2">
        {/* Record button */}
        <button
          type="button"
          onClick={startRecording}
          className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Mic className="size-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-card-foreground">Record voice note</p>
            <p className="text-xs text-muted-foreground">Tap to start · up to 5 minutes</p>
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">or upload</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Upload */}
        <label
          htmlFor="voice-upload"
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
        >
          <Upload className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium text-card-foreground">Upload voice note</p>
            <p className="text-[11px] text-muted-foreground">MP3, M4A, OGG, OPUS, WAV · Max 15 MB</p>
          </div>
          <input
            ref={fileInputRef}
            id="voice-upload"
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={handleUpload}
          />
        </label>
      </div>
    );
  }

  // ---- Recording state ----
  if (mode === "recording") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        {/* Pulsing mic */}
        <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <Mic className="size-7 text-primary" />
        </div>

        <Waveform active />

        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-semibold text-foreground">Recording…</p>
          <p className="font-mono text-lg tabular-nums text-primary">{fmtDuration(duration)}</p>
        </div>

        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-2 rounded-xl bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          <Square className="size-4 fill-destructive" />
          Stop recording
        </button>
      </div>
    );
  }

  // ---- Recorded state ----
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      {/* Play/pause */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Check className="size-3.5 text-emerald-500" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {file?.name.startsWith("recording-") ? "Voice note recorded" : "Voice note ready"}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {file ? fmtSize(file.size) : ""}
          {duration > 0 ? ` · ${fmtDuration(duration)}` : ""}
        </p>
        <Waveform active={playing} />
      </div>

      <button
        type="button"
        onClick={handleRemove}
        title="Remove"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
