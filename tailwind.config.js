/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          400: "#D4AF37",
          500: "#C5A028",
          600: "#B0901E",
        },
        "island-bg": "var(--island-bg)",
        "island-border": "var(--island-border)",
        "island-text": "var(--island-text)",
        "island-accent": "var(--island-accent)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.2s ease-in",
        "expand-width": "expandWidth 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "contract-width": "contractWidth 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        slideUp: {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(100%)", opacity: "0" },
        },
        expandWidth: {
          from: { maxWidth: "360px" },
          to: { maxWidth: "520px" },
        },
        contractWidth: {
          from: { maxWidth: "520px" },
          to: { maxWidth: "360px" },
        },
      },
    },
  },
  plugins: [],
};
