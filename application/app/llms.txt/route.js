import { buildLlmsIndex } from "../../lib/aiDiscovery";
import { getPublicStats } from "../../lib/publicStats";
import { getSiteUrl } from "../../lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = buildLlmsIndex({
    siteUrl: getSiteUrl(),
    stats: await getPublicStats()
  });

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
