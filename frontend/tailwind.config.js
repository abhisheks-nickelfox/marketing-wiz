/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-fixed-dim": "#ffb59a",
        "tertiary-fixed": "#d6e3ff",
        "inverse-surface": "#2f3130",
        "inverse-on-surface": "#f1f1ef",
        "surface": "#f9f9f7",
        "secondary-fixed": "#ffdbce",
        "outline-variant": "#e0bfb4",
        "on-error-container": "#93000a",
        "primary-fixed": "#ffdbce",
        "secondary-container": "#fda685",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#72351c",
        "primary-container": "#c84b0e",
        "on-surface": "#1a1c1b",
        "surface-tint": "#a73a00",
        "surface-container-lowest": "#ffffff",
        "on-primary-container": "#fffaf9",
        "on-tertiary": "#ffffff",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "tertiary-fixed-dim": "#aac7ff",
        "secondary-fixed-dim": "#ffb59a",
        "on-secondary": "#ffffff",
        "secondary": "#8f4c31",
        "on-background": "#1a1c1b",
        "on-tertiary-fixed": "#001b3e",
        "on-tertiary-container": "#fcfbff",
        "tertiary": "#005ab2",
        "on-tertiary-fixed-variant": "#00468c",
        "outline": "#8c7167",
        "surface-container": "#eeeeec",
        "surface-container-high": "#e8e8e6",
        "surface-bright": "#f9f9f7",
        "error": "#ba1a1a",
        "surface-dim": "#dadad8",
        "background": "#f9f9f7",
        "on-secondary-fixed": "#370e00",
        "on-surface-variant": "#594139",
        "on-secondary-container": "#773920",
        "surface-container-highest": "#e2e3e1",
        "surface-variant": "#e2e3e1",
        "primary": "#a23800",
        "inverse-primary": "#ffb59a",
        "surface-container-low": "#f4f4f2",
        "on-primary-fixed": "#370e00",
        "tertiary-container": "#0072df",
        "on-primary-fixed-variant": "#802a00"
      },
      fontFamily: {
        "headline": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out forwards",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
