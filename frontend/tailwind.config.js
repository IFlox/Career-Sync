/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F5F3",
        surface: "#FFFFFF",
        cardMuted: "#ECECE9",
        terracotta: {
          50: "#FCF3F0",
          100: "#F7E1DA",
          500: "#E05638",
          600: "#C94529",
          700: "#A8361D",
        },
        obsidian: "#141413",
        subtle: "#7E7D78",
      },
      borderRadius: {
        '2.5xl': '1.35rem',
        '3xl': '1.75rem',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};