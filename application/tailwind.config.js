const config = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        panel: "#f8fafc",
        line: "#e2e8f0",
        action: "#4f46e5",
        "action-dark": "#4338ca",
        cyan: {
          50: "#ecfeff",
          100: "#cffaff",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490"
        },
        indigo: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca"
        },
        success: "#10b981",
        warning: "#d97706",
        danger: "#ef4444"
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        DEFAULT: "0.625rem",
        lg: "0.75rem",
        xl: "1rem"
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
        raised: "0 4px 12px rgba(15, 23, 42, 0.06), 0 20px 40px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
