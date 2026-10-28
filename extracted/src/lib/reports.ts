// Helpers for the Reports page: CSV export, date handling and counting.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Quotes a CSV cell, and defuses spreadsheet formulas (a cell starting with = or @ would otherwise run in Excel). */
export function csvCell(value: unknown): string {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  const looksLikeFormula = /^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text));
  if (looksLikeFormula) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); // BOM so Excel reads UTF-8
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Today as YYYY-MM-DD in the user's own time zone (used in file names). */
export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Reads the date formats the app stores: "Oct 26, 2026" (prayer requests, activity) and
 * "2026-09-26 20:55:17" (database timestamps, which are UTC). Returns null when unreadable.
 */
export function parseDate(text: string | null | undefined): Date | null {
  if (!text) return null;
  const s = String(text).trim();
  let m = s.match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase());
    if (month >= 0) return new Date(Number(m[3]), month, Number(m[2]));
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    if (m[4] === undefined) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0)));
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export type RangePreset = "all" | "7d" | "30d" | "month" | "year" | "custom";
export interface DateRange { from: Date | null; to: Date | null }

export const RANGE_LABELS: Record<RangePreset, string> = {
  all: "All time", "7d": "Last 7 days", "30d": "Last 30 days", month: "This month", year: "This year", custom: "Custom range",
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** "YYYY-MM-DD" from a date input as a local date. */
function fromInput(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function rangeFor(preset: RangePreset, fromInputValue = "", toInputValue = ""): DateRange {
  const today = new Date();
  switch (preset) {
    case "7d": return { from: startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to: endOfDay(today) };
    case "30d": return { from: startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to: endOfDay(today) };
    case "month": return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: endOfDay(today) };
    case "year": return { from: new Date(today.getFullYear(), 0, 1), to: endOfDay(today) };
    case "custom": {
      const from = fromInput(fromInputValue);
      const to = fromInput(toInputValue);
      return { from: from ? startOfDay(from) : null, to: to ? endOfDay(to) : null };
    }
    default: return { from: null, to: null };
  }
}

/** A record with no readable date is kept only when no date filter is active. */
export function inRange(date: Date | null, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  if (!date) return false;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/** Counts items per label, largest first. */
export function countBy<T>(items: T[], label: (item: T) => string): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = label(item) || "—";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ label: name, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Counts items for a fixed list of labels (zeros included), in that order. */
export function countInOrder<T>(items: T[], labels: string[], label: (item: T) => string): { label: string; count: number }[] {
  return labels.map(name => ({ label: name, count: items.filter(item => label(item) === name).length }));
}
