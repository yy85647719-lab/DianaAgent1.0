import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          "Arial",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 12px 36px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
