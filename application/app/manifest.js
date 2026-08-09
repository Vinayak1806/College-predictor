export default function manifest() {
  return {
    name: "Admission Compass - Maharashtra Engineering College Predictor",
    short_name: "Admission Compass",
    description: "First-Year and Direct Second-Year Maharashtra engineering college predictions using verified CAP cutoff records.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f8",
    theme_color: "#0f7188",
    icons: [
      {
        src: "/admission-compass-mark.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
