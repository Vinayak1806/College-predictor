const config = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        panel: "#f5f8fc",
        line: "#dbe3ee",
        action: "#0f7185",
        success: "#147a55",
        warning: "#a65a10",
        danger: "#b33a48"
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(23, 32, 51, 0.04), 0 10px 28px rgba(23, 32, 51, 0.07)",
        raised: "0 2px 6px rgba(23, 32, 51, 0.06), 0 18px 44px rgba(23, 32, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
