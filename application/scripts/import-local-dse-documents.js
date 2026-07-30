import fs from "node:fs/promises";
import path from "node:path";
import { createAndProcessImport, publishAdminImport } from "../lib/adminImports.js";
import { prisma } from "../lib/prisma.js";

const projectRoot = path.resolve(process.cwd(), "..");
const documents = [
  {
    filename: "DSE_CAP_ROUND_I_CUTOFF_2024_25.pdf",
    documentType: "CUTOFF_PDF",
    academicYear: "2024-25",
    capRound: 1
  },
  {
    filename: "DSE_CAP_ROUND_II_CUTOFF_2024_25.pdf",
    documentType: "CUTOFF_PDF",
    academicYear: "2024-25",
    capRound: 2
  },
  {
    filename: "DSE_CAP_ROUND_I_CUTOFF_2025_26.pdf",
    documentType: "CUTOFF_PDF",
    academicYear: "2025-26",
    capRound: 1
  },
  {
    filename: "DSE_CAP_ROUND_II_CUTOFF_2025_26.pdf",
    documentType: "CUTOFF_PDF",
    academicYear: "2025-26",
    capRound: 2
  },
  {
    filename: "dse_seat_matrix_2024_25.pdf",
    documentType: "SEAT_MATRIX_PDF",
    academicYear: "2024-25"
  },
  {
    filename: "dse_seat_matrix_2025_26.pdf",
    documentType: "SEAT_MATRIX_PDF",
    academicYear: "2025-26"
  }
];

async function stageDocument(document) {
  const filePath = path.join(projectRoot, document.filename);
  const bytes = await fs.readFile(filePath);
  const file = new File([bytes], document.filename, { type: "application/pdf" });
  const staged = await createAndProcessImport({
    file,
    metadata: {
      documentType: document.documentType,
      admissionRoute: "DSE",
      academicYear: document.academicYear,
      capRound: document.capRound,
      quota: "MH",
      sourceUrl: ""
    }
  });
  console.log(`${document.filename}: ${staged.status} (${staged.summary?.publishableRecords || 0} ready)`);
  if (staged.status !== "VERIFIED") {
    throw new Error(`${document.filename} has rows that require admin review.`);
  }
  return staged;
}

async function main() {
  const stagedImports = await Promise.all(documents.map(stageDocument));
  for (const staged of stagedImports) {
    const published = await publishAdminImport(staged.id);
    console.log(`${published.originalFilename}: PUBLISHED (${published.summary?.publishedRecords || 0} records)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
