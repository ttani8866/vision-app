import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF6EF",
        ink: "#1E2A3A",
        accent: "#F5D547",
        cat: {
          land: "#D96C47",
          tree: "#7A8B3F",
          brewing: "#C8912E",
          field: "#E3B23C",
          animal: "#E2725B",
          heritage: "#A63A50",
          celestial: "#2C4770",
          digital: "#1F8A8C",
        },
      },
      fontFamily: {
        mincho: ["var(--font-shippori)", "serif"],
        fraunces: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-zen-kaku)", "sans-serif"],
        data: ["var(--font-space-grotesk)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
