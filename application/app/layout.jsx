import "./globals.css";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { SiteFooter } from "../components/SiteFooter";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "../lib/site";

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  category: "education",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/engineering-students-campus.png",
        alt: "Maharashtra engineering students on a college campus"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/images/engineering-students-campus.png"]
  },
  robots: {
    index: true,
    follow: true
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
      </body>
    </html>
  );
}
