/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      sm: "480px",
      md: "640px",
      lg: "1024px",
      xl: "1440px",
      "2xl": "1920px",
    },
    extend: {
      colors: {
        bg:       "#F0F0F0",
        surface:  "#FFFFFF",
        card:     "#E8E8E8",
        accent:   "#E7473C",
        border:   "#DCDCDC",
        "text-primary":   "#1A1A1A",
        "text-secondary": "#6B6B6B",
        success:  "#2CA055",
        danger:   "#E7473C",
        warning:  "#E8A830",
        eggplant: "#A0006D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      width: {
        sidebar:   "280px",
        "icon-rail": "60px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      keyframes: {
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%":     { transform: "translateX(-8px)" },
          "40%":     { transform: "translateX(8px)" },
          "60%":     { transform: "translateX(-5px)" },
          "80%":     { transform: "translateX(5px)" },
        },
        shimmer: {
          "0%,100%": { opacity: "0.25" },
          "50%":     { opacity: "0.55" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "bounce-in": {
          "0%":   { transform: "scale(0.8)", opacity: "0" },
          "60%":  { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        spin360: {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        countdown: {
          from: { width: "100%" },
          to:   { width: "0%" },
        },
      },
      animation: {
        shake:       "shake 0.4s ease",
        shimmer:     "shimmer 4s ease-in-out infinite",
        "slide-up":  "slide-up 0.3s ease forwards",
        "fade-in":   "fade-in 0.25s ease forwards",
        "bounce-in": "bounce-in 0.35s ease-spring forwards",
        spin360:     "spin360 0.4s ease forwards",
        countdown:   "countdown 5s linear forwards",
      },
    },
  },
  plugins: [],
}
