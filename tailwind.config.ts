import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#176b5c",
          dark: "#0d4f43"
        },
        ember: "#d98e32"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(24, 32, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
