import pptxgen from "pptxgenjs";

const INDIGO = "6366f1";
const DARK = "1e1b4b";
const LIGHT_BG = "EEF2FF";

function addSlideDecorations(slide: pptxgen.Slide) {
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color: INDIGO },
    line: { color: INDIGO },
  });
  slide.addText("ScrapeIQ", {
    x: 0.3, y: 5.2, w: 2, h: 0.3,
    fontSize: 9, color: "999999", align: "left",
  });
  slide.addText("Group 20", {
    x: 7.7, y: 5.2, w: 2, h: 0.3,
    fontSize: 9, color: "999999", align: "right",
  });
}

function today(): string {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function slugDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ScrapePPTInput {
  title: string;
  url: string;
  intent: string;
  summary: string;
  analysis: string;
}

export function downloadScrapePPT(input: ScrapePPTInput) {
  const { title, url, intent, summary, analysis } = input;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  const slide1 = pres.addSlide();
  addSlideDecorations(slide1);
  slide1.addText(title || "Research Report", {
    x: 0.5, y: 1.5, w: 9, h: 1.0,
    fontSize: 28, bold: true, color: INDIGO, align: "center",
  });
  slide1.addText("Research Analysis — ScrapeIQ", {
    x: 0.5, y: 2.7, w: 9, h: 0.5,
    fontSize: 16, color: DARK, align: "center",
  });
  slide1.addText(`${url}\n${today()}`, {
    x: 0.5, y: 3.4, w: 9, h: 0.7,
    fontSize: 11, color: "666666", align: "center",
  });

  const slide2 = pres.addSlide();
  addSlideDecorations(slide2);
  slide2.addText("AI Insight", {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: INDIGO,
  });
  slide2.addText(`Goal: ${intent}`, {
    x: 0.5, y: 1.1, w: 9, h: 0.4,
    fontSize: 13, color: "888888", italic: true,
  });

  const bullets = summary
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const bulletRows = bullets.map((b) => ({ text: b, options: { bullet: { indent: 15 }, paraSpaceAfter: 8 } }));

  slide2.addText(bulletRows.length > 0 ? bulletRows : [{ text: summary.slice(0, 400), options: {} }], {
    x: 0.5, y: 1.7, w: 9, h: 3,
    fontSize: 14, color: DARK,
  });

  const slide3 = pres.addSlide();
  addSlideDecorations(slide3);
  slide3.addText("Smart Analysis", {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: INDIGO,
  });

  const analysisSections = analysis
    .split(/\n(?=##?\s)/g)
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.replace(/^##?\s*/, "").trim());

  const analysisRows = analysisSections.map((s) => {
    const [heading, ...rest] = s.split("\n");
    return {
      text: [
        { text: heading + "\n", options: { bold: true, color: INDIGO } },
        { text: rest.join(" ").trim().slice(0, 200), options: { color: DARK } },
      ],
    };
  });

  if (analysisRows.length > 0) {
    slide3.addText(
      analysisRows.flatMap((r) => [
        ...r.text.map((t) => ({ text: t.text, options: { ...t.options, paraSpaceAfter: 4 } })),
      ]),
      { x: 0.5, y: 1.2, w: 9, h: 3.5, fontSize: 12 }
    );
  } else {
    slide3.addText(analysis.slice(0, 600), {
      x: 0.5, y: 1.2, w: 9, h: 3.5,
      fontSize: 12, color: DARK,
    });
  }

  const slide4 = pres.addSlide();
  addSlideDecorations(slide4);
  slide4.addText("Source", {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: INDIGO,
  });
  slide4.addText(`${url}\n${today()}\n\nPowered by ScrapeIQ — Group 20`, {
    x: 0.5, y: 1.4, w: 9, h: 2,
    fontSize: 14, color: DARK,
  });

  try {
    const domain = new URL(url).hostname.replace("www.", "");
    pres.writeFile({ fileName: `scrapeiq-${domain}-${slugDate()}.pptx` });
  } catch {
    pres.writeFile({ fileName: `scrapeiq-report-${slugDate()}.pptx` });
  }
}

interface CompareRow {
  dimension: string;
  site1: string;
  site2: string;
}

interface ComparePPTInput {
  url1: string;
  url2: string;
  domain1: string;
  domain2: string;
  intent: string;
  keyInsight: string;
  rows: CompareRow[];
  winner: string;
  winnerWhy: string;
}

export function downloadComparePPT(input: ComparePPTInput) {
  const { url1, url2, domain1, domain2, intent, keyInsight, rows, winner, winnerWhy } = input;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  const slide1 = pres.addSlide();
  addSlideDecorations(slide1);
  slide1.addText("Competitive Analysis", {
    x: 0.5, y: 1.2, w: 9, h: 0.8,
    fontSize: 28, bold: true, color: INDIGO, align: "center",
  });
  slide1.addText(`${domain1} vs ${domain2}`, {
    x: 0.5, y: 2.1, w: 9, h: 0.6,
    fontSize: 20, bold: true, color: DARK, align: "center",
  });
  slide1.addText(`Intent: ${intent}\n${today()}`, {
    x: 0.5, y: 2.9, w: 9, h: 0.7,
    fontSize: 12, color: "666666", align: "center",
  });

  const slide2 = pres.addSlide();
  addSlideDecorations(slide2);
  slide2.addText("Key Insight", {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: INDIGO,
  });
  slide2.addRect({ x: 0, y: 1.1, w: 0.06, h: 3.5, fill: { color: INDIGO } });
  slide2.addText(keyInsight || "No key insight available.", {
    x: 0.4, y: 1.2, w: 9.1, h: 3.3,
    fontSize: 14, color: DARK,
    valign: "top",
  });

  const slide3 = pres.addSlide();
  addSlideDecorations(slide3);
  slide3.addText("Head to Head", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: INDIGO,
  });

  if (rows.length > 0) {
    const tableRows: pptxgen.TableRow[] = [
      [
        { text: "Dimension", options: { bold: true, color: "FFFFFF", fill: { color: INDIGO }, fontSize: 11 } },
        { text: domain1, options: { bold: true, color: "FFFFFF", fill: { color: INDIGO }, fontSize: 11 } },
        { text: domain2, options: { bold: true, color: "FFFFFF", fill: { color: INDIGO }, fontSize: 11 } },
      ],
      ...rows.map((row, i) => [
        { text: row.dimension, options: { bold: true, color: DARK, fill: { color: i % 2 === 0 ? "FFFFFF" : LIGHT_BG }, fontSize: 10 } },
        { text: row.site1, options: { color: DARK, fill: { color: i % 2 === 0 ? "FFFFFF" : LIGHT_BG }, fontSize: 10 } },
        { text: row.site2, options: { color: DARK, fill: { color: i % 2 === 0 ? "FFFFFF" : LIGHT_BG }, fontSize: 10 } },
      ]),
    ];

    slide3.addTable(tableRows, {
      x: 0.3, y: 0.9, w: 9.4,
      colW: [2, 3.7, 3.7],
      border: { type: "solid", color: "E0E7FF", pt: 1 },
    });
  }

  const slide4 = pres.addSlide();
  addSlideDecorations(slide4);
  slide4.addText("And the Winner is...", {
    x: 0.5, y: 0.8, w: 9, h: 0.7,
    fontSize: 28, bold: true, color: INDIGO, align: "center",
  });
  slide4.addText(winner, {
    x: 0.5, y: 1.7, w: 9, h: 1.0,
    fontSize: 40, bold: true, color: INDIGO, align: "center",
  });
  slide4.addText(winnerWhy || "", {
    x: 1, y: 2.9, w: 8, h: 1.2,
    fontSize: 15, color: DARK, align: "center",
  });
  slide4.addText(`${url1} vs ${url2}`, {
    x: 0.5, y: 4.3, w: 9, h: 0.4,
    fontSize: 9, color: "AAAAAA", align: "center",
  });

  pres.writeFile({ fileName: `scrapeiq-${domain1}-vs-${domain2}-${slugDate()}.pptx` });
}
