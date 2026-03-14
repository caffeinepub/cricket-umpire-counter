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
        mono: ["JetBrains Mono", "monospace"],
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
        /* Boundary warm amber */
        boundary: {
          DEFAULT: "oklch(var(--boundary) / <alpha-value>)",
          foreground: "oklch(var(--boundary-foreground))",
        },
        /* Wide: blue */
        "blue-extra": {
          DEFAULT: "oklch(var(--blue-extra) / <alpha-value>)",
          foreground: "oklch(var(--blue-extra-foreground))",
        },
        /* No Ball: amber-brown */
        "noball-extra": {
          DEFAULT: "oklch(var(--noball-extra) / <alpha-value>)",
          foreground: "oklch(var(--noball-extra-foreground))",
        },
        /* Bye: teal */
        "teal-extra": {
          DEFAULT: "oklch(var(--teal-extra) / <alpha-value>)",
          foreground: "oklch(var(--teal-extra-foreground))",
        },
        /* Leg Bye: dark green */
        "bye-extra": {
          DEFAULT: "oklch(var(--bye-extra) / <alpha-value>)",
          foreground: "oklch(var(--bye-extra-foreground))",
        },
        /* Undo dark forest green */
        "undo-btn": {
          DEFAULT: "oklch(var(--undo-btn) / <alpha-value>)",
          foreground: "oklch(var(--undo-btn-foreground))",
        },
        /* Reset dark maroon */
        "reset-btn": {
          DEFAULT: "oklch(var(--reset-btn) / <alpha-value>)",
          foreground: "oklch(var(--reset-btn-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
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
        xs: "0 1px 2px 0 rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
        btn: "0 2px 4px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)",
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
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "score-pop": "score-pop 0.22s ease-in-out",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
