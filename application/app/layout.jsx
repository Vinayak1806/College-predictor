import "./globals.css";
import { SiteFooter } from "../components/SiteFooter";

export const metadata = {
  title: "Maharashtra Engineering College Predictor",
  description: "FE and DSE college prediction using structured official CAP cutoff records."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
