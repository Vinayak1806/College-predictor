const config = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18202a",
        panel: "#f6f8fb",
        line: "#dbe2ea",
        action: "#176b87",
        success: "#1f7a4d",
        warning: "#a15c12",
        danger: "#a33a3a"
      }
    }
  },
  plugins: []
};

export default config;
