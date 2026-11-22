import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
        },
        line: "var(--line)",
        cobalt: "var(--cobalt)",
        coral: "var(--coral)",
        sun: "var(--sun)",
        paper: "var(--paper)",
      },
    },
  },
  plugins: [],
};

export default config;
