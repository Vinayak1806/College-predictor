const config = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132838",
        panel: "#f3f7f8",
        line: "#d6e1e6",
        action: "#0f7188",
        success: "#167a52",
        warning: "#aa5a0a",
        danger: "#b13b3b"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(18, 52, 69, 0.07)",
        raised: "0 14px 34px rgba(18, 52, 69, 0.11)"
      }
    }
  },
  plugins: []
};

export default config;
