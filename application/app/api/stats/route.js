import { json } from "../../../lib/http";
import { getPublicStats } from "../../../lib/publicStats";

export async function GET() {
  return json({ data: await getPublicStats() });
}
