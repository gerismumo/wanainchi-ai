"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { kenyaLocations } from "ke-locations-data";
import type { SearchResult } from "ke-locations-data";
import { MapPin, Search, X, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type LocationType = "county" | "constituency" | "ward" | "locality" | "area";

export interface ResolvedLocation {
  location_type: LocationType;
  location_code: string;
  location_name: string;
  county_code: string | null;
  county_name: string | null;
  constituency_code: string | null;
  constituency_name: string | null;
  locality_code: string | null;
  locality_name: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TYPE_ORDER: LocationType[] = ["county", "constituency", "ward", "locality", "area"];
const TYPE_LABELS: Record<LocationType, string> = {
  county: "County",
  constituency: "Constituency",
  ward: "Ward",
  locality: "Locality",
  area: "Area",
};
const TYPE_COLOR: Record<LocationType, string> = {
  county: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  constituency: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  ward: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  locality: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  area: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

function getItemCode(r: SearchResult): string {
  return (r.item as { code: string }).code;
}

function getItemName(r: SearchResult): string {
  return (r.item as { name: string }).name;
}

function getSubLabel(r: SearchResult): string {
  const i = r.item as unknown as Record<string, string>;
  const parts: string[] = [];
  if (i.constituency_name) parts.push(i.constituency_name);
  if (i.county_name) parts.push(i.county_name);
  if (i.locality) parts.push(i.locality);
  return parts.slice(0, 2).join(", ");
}

function toResolved(r: SearchResult): ResolvedLocation {
  const i = r.item as unknown as Record<string, string>;
  return {
    location_type: r.type as LocationType,
    location_code: i.code!,
    location_name: i.name!,
    county_code: i.county_code ?? null,
    county_name: i.county_name ?? null,
    constituency_code: i.constituency_code ?? null,
    constituency_name: i.constituency_name ?? null,
    locality_code: r.type === "locality" ? i.code! : (i.locality ?? null),
    locality_name: r.type === "locality" ? i.name! : (i.locality ?? null),
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface LocationPickerProps {
  value: ResolvedLocation | null;
  onChange: (loc: ResolvedLocation | null) => void;
  /** Show the auto-detect button. Default true. */
  showDetect?: boolean;
  placeholder?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LocationPicker({
  value,
  onChange,
  showDetect = true,
  placeholder = "Search ward, constituency, county…",
  className,
}: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [activeType, setActiveType] = useState<LocationType | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search on query change
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      const raw = kenyaLocations.search(
        query,
        activeType === "all" ? 12 : activeType,
        activeType === "all" ? 12 : 8,
      );
      // Sort by type priority so counties appear before wards
      const sorted = [...raw].sort(
        (a, b) => TYPE_ORDER.indexOf(a.type as LocationType) - TYPE_ORDER.indexOf(b.type as LocationType),
      );
      setResults(sorted);
      setOpen(true);
    }, 200);
  }, [query, activeType]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current && !listRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-detect via Geolocation + Nominatim → search
  const detect = useCallback(async () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`,
          );
          const data = await res.json();
          const addr = data.address ?? {};
          // Try ward → suburb → neighbourhood → county in order
          const candidates = [
            addr.city_district, addr.suburb, addr.neighbourhood,
            addr.quarter, addr.village, addr.town, addr.county,
          ].filter(Boolean) as string[];

          for (const term of candidates) {
            const hits = kenyaLocations.search(term, 3);
            if (hits.length) {
              const best = hits[0]!;
              onChange(toResolved(best));
              setQuery(getItemName(best));
              setOpen(false);
              setDetecting(false);
              return;
            }
          }
          // Fallback: try the display name words
          const words = (data.display_name as string).split(",").map((s: string) => s.trim());
          for (const word of words) {
            const hits = kenyaLocations.search(word, 3);
            if (hits.length) {
              const best = hits[0]!;
              onChange(toResolved(best));
              setQuery(getItemName(best));
              setOpen(false);
              break;
            }
          }
        } catch { /* silent */ }
        setDetecting(false);
      },
      () => setDetecting(false),
      { timeout: 8000 },
    );
  }, [onChange]);

  const handleSelect = useCallback((r: SearchResult) => {
    onChange(toResolved(r));
    setQuery(getItemName(r));
    setOpen(false);
    setResults([]);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      {/* Type filter chips */}
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {(["all", ...TYPE_ORDER] as (LocationType | "all")[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setActiveType(t); if (query) inputRef.current?.focus(); }}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
              activeType === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {t === "all" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onChange(null); }}
            onFocus={() => results.length && setOpen(true)}
            placeholder={placeholder}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-sm text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Detect button */}
        {showDetect && (
          <button
            type="button"
            onClick={detect}
            disabled={detecting}
            title="Detect my location"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
              detecting
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
            )}
          >
            {detecting ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          </button>
        )}
      </div>

      {/* Selected pill */}
      {value && !open && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-primary">{value.location_name}</span>
            {(value.constituency_name || value.county_name) && (
              <span className="truncate text-[11px] text-muted-foreground">
                {[value.constituency_name, value.county_name].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", TYPE_COLOR[value.location_type])}>
            {TYPE_LABELS[value.location_type]}
          </span>
          <button type="button" onClick={handleClear} className="ml-1 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg"
        >
          {results.map((r, i) => {
            const sub = getSubLabel(r);
            return (
              <button
                key={`${r.type}-${getItemCode(r)}-${i}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 active:bg-muted"
              >
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{getItemName(r)}</span>
                  {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
                </div>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", TYPE_COLOR[r.type as LocationType])}>
                  {TYPE_LABELS[r.type as LocationType]}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-popover px-4 py-3 shadow-lg"
        >
          <p className="text-xs text-muted-foreground">No Kenya locations found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
