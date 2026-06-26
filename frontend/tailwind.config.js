/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#f8f5f1",
          100: "#f0e8df",
          200: "#dccfbe",
          500: "#ae8f6a",
          700: "#7e6245"
        },
        sage: {
          100: "#e7efe8",
          300: "#b7c9b8",
          500: "#6f8d73",
          700: "#45614a"
        }
      }
    }
  },
  plugins: [],
};
