import { useId } from "react";

/** Decorative lotus mark used for the logo and page accents. */
export function Lotus({ className = "w-8 h-8" }: { className?: string }) {
  // Unique gradient ids: a gradient defined in a hidden copy (e.g. the phone header) would not paint.
  const id = useId().replace(/:/g, "");
  const petal = `lotus-petal-${id}`;
  const side = `lotus-side-${id}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={petal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efa0bf" />
          <stop offset="100%" stopColor="#d65a8a" />
        </linearGradient>
        <linearGradient id={side} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6ccf6" />
          <stop offset="100%" stopColor="#9a83e2" />
        </linearGradient>
      </defs>
      <path d="M32 50 C14 46 6 34 4 26 C14 26 26 32 32 50Z" fill={`url(#${side})`} opacity="0.85" />
      <path d="M32 50 C50 46 58 34 60 26 C50 26 38 32 32 50Z" fill={`url(#${side})`} opacity="0.85" />
      <path d="M32 50 C20 42 16 28 20 16 C28 22 32 36 32 50Z" fill={`url(#${petal})`} opacity="0.9" />
      <path d="M32 50 C44 42 48 28 44 16 C36 22 32 36 32 50Z" fill={`url(#${petal})`} opacity="0.9" />
      <path d="M32 50 C25 38 26 20 32 8 C38 20 39 38 32 50Z" fill={`url(#${petal})`} />
      <path d="M14 54 C24 50 40 50 50 54" stroke="#5e9a73" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
