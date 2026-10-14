/** Stable, gentle colors for asana types and categories (chips on cards). */
const palette = [
  "bg-lotus-100 text-lotus-600",
  "bg-lavender-100 text-lavender-500",
  "bg-saffron-100 text-saffron-500",
  "bg-sage-100 text-sage-700",
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
];

export function chipColor(label: string): string {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function prettyLabel(label: string): string {
  return label.replace(/_/g, " ");
}
