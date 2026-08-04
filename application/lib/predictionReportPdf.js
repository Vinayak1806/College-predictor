import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

const WIDTH = 841.89;
const HEIGHT = 595.28;
const MARGIN = 36;
const columns = [
  { key: "instituteCode", label: "Code", width: 52 },
  { key: "college", label: "College", width: 238 },
  { key: "branch", label: "Branch", width: 182 },
  { key: "zone", label: "Chance", width: 72 },
  { key: "latestCutoff", label: "Cutoff", width: 64 },
  { key: "margin", label: "Margin", width: 62 },
  { key: "record", label: "Record", width: 98 }
];

function clean(value) {
  return String(value ?? "-").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim() || "-";
}

function number(value, signed = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${signed && parsed > 0 ? "+" : ""}${parsed.toFixed(2)}`;
}

function shorten(text, font, size, maxWidth) {
  let value = clean(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (value.length > 3 && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}...`;
}

function drawWatermark(page, font) {
  page.drawText("CAP PREDICTOR", {
    x: 225,
    y: 245,
    size: 54,
    font,
    color: rgb(0.08, 0.43, 0.54),
    opacity: 0.05,
    rotate: degrees(28)
  });
}

function drawHeader(page, regular, bold, report) {
  page.drawText("CAP Predictor", { x: MARGIN, y: HEIGHT - 40, size: 19, font: bold, color: rgb(0.04, 0.16, 0.24) });
  page.drawText(`${report.route} Personalized Prediction Report`, { x: MARGIN, y: HEIGHT - 58, size: 10, font: regular, color: rgb(0.32, 0.4, 0.48) });
  const owner = clean(report.studentName || report.studentEmail || "Signed-in student");
  page.drawText(shorten(owner, regular, 8, 230), { x: WIDTH - MARGIN - 230, y: HEIGHT - 50, size: 8, font: regular, color: rgb(0.35, 0.43, 0.5) });
  page.drawLine({ start: { x: MARGIN, y: HEIGHT - 70 }, end: { x: WIDTH - MARGIN, y: HEIGHT - 70 }, thickness: 1.2, color: rgb(0.08, 0.43, 0.54) });
}

function drawProfile(page, regular, bold, profile, totalResults) {
  const fields = Object.entries(profile).filter(([, value]) => value !== "" && value !== null && value !== undefined).slice(0, 6);
  page.drawText("Student profile", { x: MARGIN, y: HEIGHT - 90, size: 9, font: bold, color: rgb(0.08, 0.43, 0.54) });
  fields.forEach(([label, value], index) => {
    const x = MARGIN + ((index % 3) * 255);
    const y = HEIGHT - 107 - (Math.floor(index / 3) * 23);
    page.drawText(shorten(clean(label), regular, 7, 72), { x, y, size: 7, font: regular, color: rgb(0.42, 0.48, 0.55) });
    page.drawText(shorten(clean(value), bold, 8.5, 168), { x: x + 76, y, size: 8.5, font: bold, color: rgb(0.06, 0.12, 0.18) });
  });
  page.drawText(`${totalResults} total matching options`, { x: WIDTH - MARGIN - 140, y: HEIGHT - 90, size: 8, font: bold, color: rgb(0.06, 0.37, 0.47) });
}

function drawTableHeader(page, bold, y) {
  page.drawRectangle({ x: MARGIN, y: y - 24, width: WIDTH - (2 * MARGIN), height: 24, color: rgb(0.06, 0.37, 0.47) });
  let x = MARGIN;
  columns.forEach((column) => {
    page.drawText(column.label, { x: x + 6, y: y - 16, size: 7.5, font: bold, color: rgb(1, 1, 1) });
    x += column.width;
  });
  return y - 24;
}

function drawRow(page, regular, row, y, index) {
  const height = 29;
  page.drawRectangle({
    x: MARGIN,
    y: y - height,
    width: WIDTH - (2 * MARGIN),
    height,
    color: index % 2 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.83, 0.86, 0.89),
    borderWidth: 0.4
  });
  const values = {
    ...row,
    latestCutoff: number(row.latestCutoff),
    margin: number(row.margin, true),
    record: `${clean(row.year)} R${clean(row.round)}`
  };
  let x = MARGIN;
  columns.forEach((column) => {
    page.drawText(shorten(values[column.key], regular, 7.5, column.width - 11), {
      x: x + 6,
      y: y - 18,
      size: 7.5,
      font: regular,
      color: rgb(0.08, 0.14, 0.2)
    });
    x += column.width;
  });
  return y - height;
}

export async function createPredictionReportPdf(report, generatedAt = new Date()) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const results = report.results.slice(0, 30);
  let resultIndex = 0;

  while (resultIndex < results.length || pdf.getPageCount() === 0) {
    const page = pdf.addPage([WIDTH, HEIGHT]);
    drawHeader(page, regular, bold, report);
    drawWatermark(page, bold);
    let y = HEIGHT - 84;
    if (pdf.getPageCount() === 1) {
      drawProfile(page, regular, bold, report.profile, report.totalResults);
      y = HEIGHT - 157;
    }
    y = drawTableHeader(page, bold, y);
    while (resultIndex < results.length && y > 62) {
      y = drawRow(page, regular, results[resultIndex], y, resultIndex);
      resultIndex += 1;
    }
    page.drawText(`Generated ${generatedAt.toLocaleDateString("en-IN")} | Historical cutoffs do not guarantee admission.`, {
      x: MARGIN,
      y: 24,
      size: 7,
      font: regular,
      color: rgb(0.42, 0.48, 0.55)
    });
  }

  pdf.setTitle(`${report.route} Personalized Prediction Report`);
  pdf.setAuthor("CAP Predictor");
  return Buffer.from(await pdf.save());
}
