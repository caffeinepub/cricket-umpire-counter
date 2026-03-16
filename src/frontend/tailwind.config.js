import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        body: ["Figtree", "sans-serif"],
      },
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        cricket: {
          green: "oklch(0.55 0.22 145)",
          "dark-green": "oklch(0.28 0.14 155)",
          amber: "oklch(0.78 0.20 70)",
          "amber-warm": "oklch(0.70 0.22 68)",
          red: "oklch(0.52 0.25 20)",
          blue: "oklch(0.56 0.25 255)",
          teal: "oklch(0.64 0.18 180)",
          grey: "oklch(0.38 0.04 255)",
          "dark-red": "oklch(0.42 0.20 15)",
          forest: "oklch(0.50 0.18 147)",
          lime: "oklch(0.60 0.22 130)",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        btn: "0 4px 14px rgba(0,0,0,0.3)",
        card: "0 4px 28px rgba(0,0,0,0.55), 0 0 0 1px oklch(0.55 0.22 145 / 0.12)",
        scoreboard: "0 8px 48px rgba(0,0,0,0.6), 0 0 60px rgba(0,200,80,0.18)",
        "neon-green": "0 0 20px oklch(0.55 0.22 145 / 0.60), 0 4px 14px oklch(0.55 0.22 145 / 0.35)",
        "neon-amber": "0 0 22px oklch(0.78 0.20 70 / 0.60), 0 4px 16px oklch(0.78 0.20 70 / 0.40)",
        "neon-red": "0 0 24px oklch(0.52 0.25 20 / 0.65), 0 4px 20px oklch(0.52 0.25 20 / 0.45)",
        "neon-blue": "0 0 18px oklch(0.56 0.25 255 / 0.50), 0 4px 12px oklch(0.56 0.25 255 / 0.35)",
        "neon-teal": "0 0 18px oklch(0.64 0.18 180 / 0.50), 0 4px 12px oklch(0.64 0.18 180 / 0.35)",
        glass: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.13)" },
          "100%": { transform: "scale(1)" },
        },
        "wicket-pulse": {
          "0%, 100%": { boxShadow: "0 0 18px oklch(0.52 0.25 20 / 0.50), 0 4px 16px oklch(0.52 0.25 20 / 0.35)" },
          "50%": { boxShadow: "0 0 36px oklch(0.58 0.28 18 / 0.80), 0 0 52px oklch(0.52 0.25 20 / 0.35), 0 4px 20px oklch(0.52 0.25 20 / 0.55)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "score-pop": "score-pop 0.25s ease-in-out",
        "wicket-pulse": "wicket-pulse 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
