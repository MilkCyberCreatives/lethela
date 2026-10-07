// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        // shadcn token mapping (reads from CSS variables you defined in globals.css)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Brand aliases you’re using in class names
        "lethela-primary": "#B5001B",
        "lethela-secondary": "#080B27",
      },
      // Opacity steps the components already use (e.g. text-white/68, border-white/12) that
      // Tailwind's default scale lacks. Without them those classes generate no CSS and the
      // intended softer text and borders silently fall back to solid colours.
      opacity: {
        6: "0.06",
        7: "0.07",
        8: "0.08",
        12: "0.12",
        18: "0.18",
        38: "0.38",
        52: "0.52",
        56: "0.56",
        58: "0.58",
        62: "0.62",
        64: "0.64",
        68: "0.68",
        72: "0.72",
        74: "0.74",
        78: "0.78",
        82: "0.82",
        88: "0.88",
        92: "0.92",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
