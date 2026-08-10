import { absoluteUrl, getSiteUrl } from "../lib/site";

export const dynamic = "force-dynamic";

export default function robots() {
  if (process.env.ALLOW_SEARCH_INDEXING !== "true") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/"
      }
    };
  }

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
