/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: { 50: "#fbf7f2", 100: "#f3eadf", 200: "#e6d6c3", 500: "#b48d62", 700: "#7e6245" },
        sage: { 50: "#f1f7f2", 100: "#e2efe5", 200: "#c5dfcb", 300: "#a3cbad", 500: "#5e9a73", 600: "#4c8461", 700: "#3c6a4e", 800: "#2f533e" },
        lotus: { 50: "#fdf2f6", 100: "#fbe2ec", 200: "#f6c4d8", 300: "#efa0bf", 400: "#e57aa3", 500: "#d65a8a", 600: "#b8436f" },
        saffron: { 50: "#fff7eb", 100: "#feecc9", 200: "#fdd893", 300: "#fbc15c", 400: "#f6a935", 500: "#e88f17" },
        lavender: { 50: "#f5f3fd", 100: "#ebe6fb", 200: "#d6ccf6", 300: "#b9a8ee", 400: "#9a83e2", 500: "#7c61cf" },
        plum: { 600: "#6b4a7a", 700: "#563a63", 800: "#3f2a4a", 900: "#2b1d33" },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 12px 32px -14px rgba(86, 58, 99, 0.22)",
      },
      keyframes: {
        breathe: { "0%, 100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.04)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        breathe: "breathe 7s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
