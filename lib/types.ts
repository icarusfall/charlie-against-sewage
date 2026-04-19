export type QualityStatus =
  | "excellent"
  | "good"
  | "sufficient"
  | "poor"
  | "unclassified";

export function normalizeStatus(s: string | null | undefined): QualityStatus {
  if (!s) return "unclassified";
  const t = s.toLowerCase().trim();
  if (t.startsWith("excel")) return "excellent";
  if (t.startsWith("good")) return "good";
  if (t.startsWith("suffic")) return "sufficient";
  if (t.startsWith("poor")) return "poor";
  return "unclassified";
}

export const STATUS_COLOR: Record<QualityStatus, string> = {
  excellent: "#059669",
  good: "#84cc16",
  sufficient: "#f59e0b",
  poor: "#dc2626",
  unclassified: "#6b7280",
};
