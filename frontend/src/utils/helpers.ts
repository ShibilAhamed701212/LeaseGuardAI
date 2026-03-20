// utils/helpers.ts — shared utility functions

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime   = (typeof ALLOWED_MIME)[number];

export function isValidFileType(file: File): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function friendlyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred.";
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function truncate(s: string, maxLen = 40): string {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}
