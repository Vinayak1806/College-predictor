import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const TABLE_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const HEADER_HEIGHT = 28;
const FOOTER_HEIGHT = 34;
const BODY_FONT_SIZE = 9;
const LINE_HEIGHT = 11;

const columns = [
  { label: "College Code", key: "instituteCode", width: 70, align: "center" },
  { label: "College Name", key: "college", width: 276 },
  { label: "Branch", key: "branch", width: 238 },
  { label: "Latest Cutoff", key: "cutoff", width: 100, align: "center" },
  { label: "Cutoff Year", key: "year", width: TABLE_WIDTH - 684, align: "center" }
];

function cleanText(value) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function cutoffText(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "-";
}

function wrapText(text, font, size, maxWidth, maxLines = 4) {
  const words = cleanText(text).split(" ").filter(Boolean);
  if (!words.length) return ["-"];

  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    while (font.widthOfTextAtSize(current, size) > maxWidth) {
      let splitAt = current.length - 1;
      while (splitAt > 1 && font.widthOfTextAtSize(`${current.slice(0, splitAt)}-`, size) > maxWidth) {
        splitAt -= 1;
      }
      lines.push(`${current.slice(0, splitAt)}-`);
      current = current.slice(splitAt);
    }
  }

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  let last = visible[maxLines - 1];
  while (last.length > 1 && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) {
    last = last.slice(0, -1);
  }
  visible[maxLines - 1] = `${last}...`;
  return visible;
}

function drawWatermark(page, boldFont) {
  page.drawText("CAP PREDICTOR", {
    x: 215,
    y: 235,
    size: 58,
    font: boldFont,
    color: rgb(0.16, 0.48, 0.58),
    opacity: 0.055,
    rotate: degrees(28)
  });
}

function drawPageHeading(page, regularFont, boldFont, generatedLabel) {
  page.drawText("CAP Predictor", {
    x: MARGIN,
    y: PAGE_HEIGHT - 43,
    size: 20,
    font: boldFont,
    color: rgb(0.05, 0.18, 0.28)
  });
  page.drawText("College Preference List", {
    x: MARGIN,
    y: PAGE_HEIGHT - 62,
    size: 10,
    font: regularFont,
    color: rgb(0.35, 0.43, 0.52)
  });

  const generatedWidth = regularFont.widthOfTextAtSize(generatedLabel, 8);
  page.drawText(generatedLabel, {
    x: PAGE_WIDTH - MARGIN - generatedWidth,
    y: PAGE_HEIGHT - 54,
    size: 8,
    font: regularFont,
    color: rgb(0.42, 0.48, 0.55)
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 74 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 74 },
    thickness: 1.2,
    color: rgb(0.08, 0.43, 0.54)
  });
}

function drawTableHeader(page, boldFont, topY) {
  page.drawRectangle({
    x: MARGIN,
    y: topY - HEADER_HEIGHT,
    width: TABLE_WIDTH,
    height: HEADER_HEIGHT,
    color: rgb(0.06, 0.37, 0.47)
  });

  let x = MARGIN;
  for (const column of columns) {
    const textWidth = boldFont.widthOfTextAtSize(column.label, 8);
    const textX = column.align === "center" ? x + ((column.width - textWidth) / 2) : x + 7;
    page.drawText(column.label, {
      x: textX,
      y: topY - 18,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1)
    });
    x += column.width;
  }
  return topY - HEADER_HEIGHT;
}

function drawFooter(page, regularFont, pageNumber, totalPages) {
  page.drawLine({
    start: { x: MARGIN, y: FOOTER_HEIGHT },
    end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_HEIGHT },
    thickness: 0.6,
    color: rgb(0.78, 0.82, 0.86)
  });
  page.drawText("CAP Predictor - Maharashtra Engineering Admissions", {
    x: MARGIN,
    y: 20,
    size: 7.5,
    font: regularFont,
    color: rgb(0.42, 0.48, 0.55)
  });

  const pageLabel = `Page ${pageNumber} of ${totalPages}`;
  const width = regularFont.widthOfTextAtSize(pageLabel, 7.5);
  page.drawText(pageLabel, {
    x: PAGE_WIDTH - MARGIN - width,
    y: 20,
    size: 7.5,
    font: regularFont,
    color: rgb(0.42, 0.48, 0.55)
  });
}

function prepareRow(item, font) {
  const values = {
    instituteCode: cleanText(item.instituteCode) || "-",
    college: cleanText(item.college) || "-",
    branch: cleanText(item.branch) || "-",
    cutoff: cutoffText(item.cutoff),
    year: cleanText(item.year) || "-"
  };

  const cells = columns.map((column) => ({
    ...column,
    lines: wrapText(values[column.key], font, BODY_FONT_SIZE, column.width - 14)
  }));
  const lineCount = Math.max(...cells.map((cell) => cell.lines.length));
  return { cells, height: Math.max(32, (lineCount * LINE_HEIGHT) + 14) };
}

function drawRow(page, regularFont, row, topY, rowIndex) {
  const bottomY = topY - row.height;
  page.drawRectangle({
    x: MARGIN,
    y: bottomY,
    width: TABLE_WIDTH,
    height: row.height,
    color: rowIndex % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
    borderColor: rgb(0.82, 0.85, 0.88),
    borderWidth: 0.5
  });

  let x = MARGIN;
  for (const cell of row.cells) {
    cell.lines.forEach((line, lineIndex) => {
      const textWidth = regularFont.widthOfTextAtSize(line, BODY_FONT_SIZE);
      const textX = cell.align === "center" ? x + ((cell.width - textWidth) / 2) : x + 7;
      page.drawText(line, {
        x: textX,
        y: topY - 12 - (lineIndex * LINE_HEIGHT),
        size: BODY_FONT_SIZE,
        font: regularFont,
        color: rgb(0.08, 0.14, 0.2)
      });
    });

    x += cell.width;
    if (x < PAGE_WIDTH - MARGIN - 1) {
      page.drawLine({
        start: { x, y: bottomY },
        end: { x, y: topY },
        thickness: 0.4,
        color: rgb(0.84, 0.87, 0.9)
      });
    }
  }

  return bottomY;
}

export async function createPreferenceListPdf(items, generatedAt = new Date()) {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const generatedLabel = `Generated ${generatedAt.toLocaleDateString("en-IN")}`;

  pdf.setTitle("CAP Predictor College Preference List");
  pdf.setAuthor("CAP Predictor");
  pdf.setCreator("CAP Predictor");
  pdf.setProducer("CAP Predictor");

  const rows = items.map((item) => prepareRow(item, regularFont));
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageHeading(page, regularFont, boldFont, generatedLabel);
  let cursorY = drawTableHeader(page, boldFont, PAGE_HEIGHT - 92);

  rows.forEach((row, index) => {
    if (cursorY - row.height < FOOTER_HEIGHT + 12) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageHeading(page, regularFont, boldFont, generatedLabel);
      cursorY = drawTableHeader(page, boldFont, PAGE_HEIGHT - 92);
    }
    cursorY = drawRow(page, regularFont, row, cursorY, index);
  });

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    drawWatermark(currentPage, boldFont);
    drawFooter(currentPage, regularFont, index + 1, pages.length);
  });
  return Buffer.from(await pdf.save());
}
