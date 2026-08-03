import { prisma } from "../lib/prisma.js";

const applyChanges = process.argv.includes("--apply");

const officialSources = new Map([
  ["FE|2023-24|1|MH", "https://fe2025.mahacet.org/2023/2023ENGG_CAP1_CutOff.pdf"],
  ["FE|2023-24|2|MH", "https://fe2025.mahacet.org/2023/2023ENGG_CAP2_CutOff.pdf"],
  ["FE|2023-24|3|MH", "https://fe2025.mahacet.org/2023/2023ENGG_CAP3_CutOff.pdf"],
  ["FE|2024-25|1|MH", "https://fe2025.mahacet.org/2024/2024ENGG_CAP1_CutOff.pdf"],
  ["FE|2024-25|2|MH", "https://fe2025.mahacet.org/2024/2024ENGG_CAP2_CutOff.pdf"],
  ["FE|2024-25|3|MH", "https://fe2025.mahacet.org/2024/2024ENGG_CAP3_CutOff.pdf"],
  ["FE|2025-26|1|MH", "https://fe2025.mahacet.org/ViewPublicDocument.aspx?MenuId=2449"],
  ["FE|2025-26|2|MH", "https://fe2025.mahacet.org/ViewPublicDocument.aspx?MenuId=3475"],
  ["FE|2025-26|3|MH", "https://fe2025.mahacet.org/ViewPublicDocument.aspx?MenuId=3483"],
  ["FE|2025-26|4|MH", "https://fe2025.mahacet.org/ViewPublicDocument.aspx?MenuId=9822"],
  ["DSE|2024-25|1|MH", "https://dse2024.mahacet.org.in/dse24/"],
  ["DSE|2024-25|2|MH", "https://dse2024.mahacet.org.in/dse24/"],
  ["DSE|2025-26|1|MH", "https://dse2025.mahacet.org.in/dse25/"],
  ["DSE|2025-26|2|MH", "https://dse2025.mahacet.org.in/dse25/"]
]);

function datasetKey(dataset) {
  return [dataset.admissionRoute, dataset.academicYear, dataset.capRound, dataset.quota].join("|");
}

async function main() {
  const datasets = await prisma.cutoffDataset.findMany({
    orderBy: [
      { admissionRoute: "asc" },
      { academicYear: "asc" },
      { capRound: "asc" }
    ]
  });

  const rows = datasets.map((dataset) => {
    const key = datasetKey(dataset);
    const sourceUrl = officialSources.get(key) || null;
    return {
      id: dataset.id,
      key,
      filename: dataset.sourceFilename,
      currentUrl: dataset.sourceUrl,
      sourceUrl,
      status: sourceUrl ? (dataset.sourceUrl === sourceUrl ? "CURRENT" : "READY") : "UNMAPPED"
    };
  });

  console.table(rows.map((row) => ({
    id: row.id.toString(),
    dataset: row.key,
    status: row.status,
    source: row.sourceUrl || "No official source mapped"
  })));

  const unmapped = rows.filter((row) => !row.sourceUrl);
  if (unmapped.length) {
    throw new Error(`${unmapped.length} cutoff dataset(s) have no official source mapping.`);
  }

  const pending = rows.filter((row) => row.status === "READY");
  if (!applyChanges) {
    console.log(`\nDry run: ${pending.length} dataset source URL(s) would be updated.`);
    console.log("Run `pnpm data:cutoff-sources:apply` after reviewing the table.");
    return;
  }

  await prisma.$transaction(
    pending.map((row) => prisma.cutoffDataset.update({
      where: { id: row.id },
      data: { sourceUrl: row.sourceUrl }
    }))
  );

  console.log(`\nUpdated ${pending.length} cutoff dataset source URL(s).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
