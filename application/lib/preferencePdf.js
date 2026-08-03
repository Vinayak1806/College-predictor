function ascii(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfText(value) {
  return ascii(value).replace(/([\\()])/g, "\\$1");
}

function wrap(value, width = 86) {
  const words = ascii(value).split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= width) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word.slice(0, width);
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function buildLines(items, generatedAt) {
  const lines = [
    "CAP Predictor - College Preference List",
    `Generated: ${generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    "",
    "This planning list is not an official CAP submission. Verify codes and choices on the CET Cell portal.",
    ""
  ];

  items.forEach((item, index) => {
    const heading = `${index + 1}. [${item.zone}] ${item.instituteCode} - ${item.college}`;
    lines.push(...wrap(heading));
    lines.push(...wrap(`   ${item.branchCode} - ${item.branch}`));
    const details = [
      item.city,
      item.year,
      item.round ? `CAP Round ${item.round}` : "",
      item.seatType ? `Seat ${item.seatType}` : "",
      Number.isFinite(item.cutoff) ? `Cutoff ${item.cutoff.toFixed(2)}` : ""
    ].filter(Boolean).join(" | ");
    if (details) lines.push(...wrap(`   ${details}`));
    lines.push("");
  });

  return lines;
}

function streamForLines(lines) {
  const commands = ["BT", "/F1 10 Tf", "14 TL", "46 800 Td"];
  for (const line of lines) commands.push(`(${pdfText(line)}) Tj`, "T*");
  commands.push("ET");
  return commands.join("\n");
}

export function createPreferenceListPdf(items, generatedAt = new Date()) {
  const allLines = buildLines(items, generatedAt);
  const pageLines = [];
  for (let index = 0; index < allLines.length; index += 49) {
    pageLines.push(allLines.slice(index, index + 49));
  }
  if (!pageLines.length) pageLines.push(["CAP Predictor - College Preference List", "", "No choices were provided."]);

  const objects = new Map();
  const pageIds = pageLines.map((_, index) => 4 + index * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pageLines.forEach((lines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = streamForLines(lines);
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
  });

  const maxId = Math.max(...objects.keys());
  let document = "%PDF-1.4\n% CAP Predictor\n";
  const offsets = [0];

  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = Buffer.byteLength(document, "ascii");
    document += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(document, "ascii");
  document += `xref\n0 ${maxId + 1}\n`;
  document += "0000000000 65535 f \n";
  for (let id = 1; id <= maxId; id += 1) {
    document += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(document, "ascii");
}
