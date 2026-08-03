import { absoluteUrl, getSiteUrl } from "../lib/site";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/results"]
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl()
  };
}
