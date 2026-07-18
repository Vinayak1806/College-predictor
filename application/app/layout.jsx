import "./globals.css";

export const metadata = {
  title: "Maharashtra Engineering College Predictor",
  description: "FE and DSE college prediction using structured official CAP cutoff records."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
