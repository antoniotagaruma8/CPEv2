import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'slide-down': {
          '0%': { opacity: '0', maxHeight: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', maxHeight: '500px', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;