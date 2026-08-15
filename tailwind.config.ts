import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Original league branding (do not reuse FPL/club colours or art).
        pitch: {
          50: "#f0fdf4",
          100: "#dcfce7",
          600: "#16a34a",
          700: "#15803d",
          900: "#14532d",
        },
        swiss: {
          50: "#fef2f2",
          100: "#fee2e2",
          600: "#dc2626",
          700: "#b91c1c",
          900: "#7f1d1d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
