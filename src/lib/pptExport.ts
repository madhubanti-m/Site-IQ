import pptxgen from "pptxgenjs";

const INDIGO = "6366f1";
const DARK = "1e1b4b";
const LIGHT_BG = "EEF2FF";
const WHITE = "FFFFFF";
const GRAY = "666666";

function todayFull(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function todayShort(): string {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function slugDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addTopBar(slide: pptxgen.Slide) {
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.07, fill: { color: INDIGO }, line: { color: INDIGO } });
}

function addFooter(slide: pptxgen.Slide) {
  slide.addText("ScrapeIQ  |  Group 20", {
    x: 0, y: 5.3, w: "100%", h: 0.25,
    fontSize: 8, color: "BBBBBB", align: "center",
  });
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

  let domain = "report";
  try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* */ }

  // Slide 1 — Cover
  const s1 = pres.addSlide();
  s1.background = { color: INDIGO };
  s1.addText(title || "Research Report", {
    x: 0.6, y: 1.2, w: 8.8, h: 1.1,
    fontSize: 30, bold: true, color: WHITE, align: "center",
  });
  s1.addText("Research Analysis", {
    x: 0.6, y: 2.4, w: 8.8, h: 0.55,
    fontSize: 18, color: WHITE, align: "center",
  });
  s1.addText(`Intent: ${intent}`, {
    x: 0.6, y: 3.05, w: 8.8, h: 0.45,
    fontSize: 13, color: "C7D2FE", align: "center",
  });
  s1.addText("ScrapeIQ", {
    x: 0.4, y: 5.1, w: 3, h: 0.35,
    fontSize: 10, bold: true, color: WHITE, align: "left",
  });
  s1.addText(`${todayShort()}  |  Group 20`, {
    x: 6.6, y: 5.1, w: 3, h: 0.35,
    fontSize: 10, color: "C7D2FE", align: "right",
  });

  // Slide 2 — AI Insight
  const s2 = pres.addSlide();
  addTopBar(s2);
  s2.addText("AI Insight", {
    x: 0.5, y: 0.25, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: INDIGO,
  });
  s2.addText(`Based on your research goal: ${intent}`, {
    x: 0.5, y: 0.9, w: 9, h: 0.35,
    fontSize: 12, color: GRAY, italic: true,
  });
  s2.addShape("line", { x: 0.5, y: 1.3, w: 9, h: 0, line: { color: "E0E7FF", width: 1 } });

  const bullets = summary
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  s2.addShape("rect", {
    x: 0.4, y: 1.45, w: 9.2, h: 3.2,
    fill: { color: LIGHT_BG }, line: { color: "E0E7FF", width: 1 },
    rectRadius: 0.1,
  });

  const bulletContent = bullets.length > 0
    ? bullets.map((b) => ({ text: b, options: { bullet: { code: "25CF", color: INDIGO }, paraSpaceAfter: 10 } }))
    : [{ text: summary.slice(0, 500), options: {} }];

  s2.addText(bulletContent, {
    x: 0.7, y: 1.6, w: 8.6, h: 2.9,
    fontSize: 13, color: DARK, valign: "top",
  });

  addFooter(s2);

  // Slide 3 — Smart Analysis
  const s3 = pres.addSlide();
  addTopBar(s3);
  s3.addText("Smart Analysis", {
    x: 0.5, y: 0.25, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: INDIGO,
  });
  s3.addShape("line", { x: 0.5, y: 0.9, w: 9, h: 0, line: { color: "E0E7FF", width: 1 } });

  const sections = analysis
    .split(/\n(?=##?\s)/g)
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.replace(/^##?\s*/, "").trim());

  const sectionTextParts: pptxgen.TextProps[] = [];
  sections.forEach((sec, i) => {
    const [heading, ...rest] = sec.split("\n");
    sectionTextParts.push({ text: heading + "\n", options: { bold: true, color: INDIGO, fontSize: 12 } });
    sectionTextParts.push({ text: (rest.join(" ").trim().slice(0, 180) || "—") + "\n", options: { color: DARK, fontSize: 11 } });
    if (i < sections.length - 1) {
      sectionTextParts.push({ text: "\n", options: { fontSize: 5 } });
    }
  });

  if (sectionTextParts.length > 0) {
    s3.addText(sectionTextParts, { x: 0.5, y: 1.05, w: 9, h: 4.0, valign: "top" });
  } else {
    s3.addText(analysis.slice(0, 700), { x: 0.5, y: 1.05, w: 9, h: 4.0, fontSize: 11, color: DARK });
  }

  addFooter(s3);

  // Slide 4 — Page Overview
  const s4 = pres.addSlide();
  addTopBar(s4);
  s4.addText("Page Overview", {
    x: 0.5, y: 0.25, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: INDIGO,
  });
  s4.addShape("line", { x: 0.5, y: 0.9, w: 9, h: 0, line: { color: "E0E7FF", width: 1 } });

  s4.addShape("rect", {
    x: 0.5, y: 1.1, w: 9, h: 0.55,
    fill: { color: "F9FAFB" }, line: { color: "E5E7EB", width: 1 },
  });
  s4.addText(`URL: ${url}`, {
    x: 0.7, y: 1.15, w: 8.6, h: 0.45,
    fontSize: 11, color: GRAY,
  });

  s4.addText([
    { text: "Links found: ", options: { bold: true, color: DARK } },
    { text: "See raw scrape data", options: { color: GRAY } },
  ], { x: 0.5, y: 1.85, w: 9, h: 0.4, fontSize: 12 });

  s4.addText([
    { text: "Date & Time: ", options: { bold: true, color: DARK } },
    { text: todayFull(), options: { color: GRAY } },
  ], { x: 0.5, y: 2.35, w: 9, h: 0.4, fontSize: 12 });

  addFooter(s4);

  // Slide 5 — About
  const s5 = pres.addSlide();
  s5.background = { color: LIGHT_BG };
  s5.addText("Powered by ScrapeIQ", {
    x: 0.5, y: 1.1, w: 9, h: 0.8,
    fontSize: 28, bold: true, color: INDIGO, align: "center",
  });
  s5.addText("Group 20 — Vibe Coding Hackathon", {
    x: 0.5, y: 2.0, w: 9, h: 0.45,
    fontSize: 14, color: DARK, align: "center",
  });
  s5.addShape("line", { x: 1.5, y: 2.6, w: 7, h: 0, line: { color: "C7D2FE", width: 1 } });

  s5.addText([
    { text: "Page analysed:\n", options: { bold: true, color: DARK } },
    { text: url + "\n\n", options: { color: GRAY, fontSize: 11 } },
    { text: "Research intent:\n", options: { bold: true, color: DARK } },
    { text: intent + "\n\n", options: { color: GRAY, fontSize: 11 } },
    { text: todayFull(), options: { color: GRAY, fontSize: 10 } },
  ], {
    x: 2, y: 2.85, w: 6, h: 2.2,
    fontSize: 12, align: "center",
  });

  pres.writeFile({ fileName: `scrapeiq-${domain}-${slugDate()}.pptx` });
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

  // Slide 1 — Cover
  const s1 = pres.addSlide();
  s1.background = { color: INDIGO };
  s1.addText("Competitive Analysis", {
    x: 0.6, y: 1.0, w: 8.8, h: 0.9,
    fontSize: 30, bold: true, color: WHITE, align: "center",
  });
  s1.addText(`${domain1} vs ${domain2}`, {
    x: 0.6, y: 2.0, w: 8.8, h: 0.65,
    fontSize: 22, bold: true, color: WHITE, align: "center",
  });
  s1.addText(`Research Intent: ${intent}`, {
    x: 0.6, y: 2.75, w: 8.8, h: 0.45,
    fontSize: 13, color: "C7D2FE", align: "center",
  });
  s1.addText("ScrapeIQ", {
    x: 0.4, y: 5.1, w: 3, h: 0.35,
    fontSize: 10, bold: true, color: WHITE, align: "left",
  });
  s1.addText(`${todayShort()}  |  Group 20`, {
    x: 6.6, y: 5.1, w: 3, h: 0.35,
    fontSize: 10, color: "C7D2FE", align: "right",
  });

  // Slide 2 — Key Insight
  const s2 = pres.addSlide();
  addTopBar(s2);
  s2.addText("Key Insight", {
    x: 0.5, y: 0.25, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: INDIGO,
  });
  s2.addShape("line", { x: 0.5, y: 0.9, w: 9, h: 0, line: { color: "E0E7FF", width: 1 } });
  s2.addShape("rect", {
    x: 0.4, y: 1.05, w: 9.2, h: 3.6,
    fill: { color: LIGHT_BG }, line: { color: "E0E7FF", width: 1 },
    rectRadius: 0.1,
  });
  s2.addText(keyInsight || "No key insight available.", {
    x: 0.7, y: 1.2, w: 8.6, h: 3.3,
    fontSize: 13, color: DARK, valign: "top",
  });
  addFooter(s2);

  // Slide 3 — Head to Head
  const s3 = pres.addSlide();
  addTopBar(s3);
  s3.addText("Head to Head", {
    x: 0.5, y: 0.22, w: 9, h: 0.55,
    fontSize: 24, bold: true, color: INDIGO,
  });

  if (rows.length > 0) {
    const tableRows: pptxgen.TableRow[] = [
      [
        { text: "Dimension", options: { bold: true, color: WHITE, fill: { color: INDIGO }, fontSize: 10, align: "center" } },
        { text: domain1, options: { bold: true, color: WHITE, fill: { color: INDIGO }, fontSize: 10, align: "center" } },
        { text: domain2, options: { bold: true, color: WHITE, fill: { color: INDIGO }, fontSize: 10, align: "center" } },
      ],
      ...rows.map((row, i) => [
        {
          text: row.dimension,
          options: { bold: true, color: DARK, fill: { color: i % 2 === 0 ? WHITE : LIGHT_BG }, fontSize: 10, valign: "top" as const },
        },
        {
          text: row.site1,
          options: { color: DARK, fill: { color: i % 2 === 0 ? WHITE : LIGHT_BG }, fontSize: 10, valign: "top" as const },
        },
        {
          text: row.site2,
          options: { color: DARK, fill: { color: i % 2 === 0 ? WHITE : LIGHT_BG }, fontSize: 10, valign: "top" as const },
        },
      ]),
    ];

    s3.addTable(tableRows, {
      x: 0.3, y: 0.85, w: 9.4,
      colW: [1.9, 3.75, 3.75],
      border: { type: "solid", color: "E0E7FF", pt: 1 },
      rowH: 0.55,
    });
  }

  addFooter(s3);

  // Slide 4 — Winner
  const s4 = pres.addSlide();
  addTopBar(s4);
  s4.addText("And the Winner is...", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: INDIGO, align: "center",
  });
  s4.addText(winner || "—", {
    x: 0.5, y: 1.05, w: 9, h: 0.9,
    fontSize: 36, bold: true, color: INDIGO, align: "center",
  });
  s4.addShape("line", { x: 1.5, y: 2.1, w: 7, h: 0, line: { color: "E0E7FF", width: 1 } });
  s4.addText([
    { text: "Why they win:\n", options: { bold: true, color: DARK } },
    { text: winnerWhy || "—", options: { color: GRAY } },
  ], {
    x: 1, y: 2.2, w: 8, h: 0.9,
    fontSize: 13, align: "center",
  });
  s4.addText([
    { text: "Recommended improvements for ", options: { bold: false, color: GRAY } },
    { text: domain1 === winner ? domain2 : domain1, options: { bold: true, color: DARK } },
    { text: ":", options: { color: GRAY } },
  ], {
    x: 1, y: 3.25, w: 8, h: 0.4,
    fontSize: 12,
  });
  s4.addText([
    { text: "• Review the winning site's strengths and adapt key strategies\n", options: {} },
    { text: "• Focus on areas where findings show a clear gap", options: {} },
  ], {
    x: 1, y: 3.7, w: 8, h: 0.9,
    fontSize: 11, color: GRAY,
  });
  addFooter(s4);

  // Slide 5 — About
  const s5 = pres.addSlide();
  s5.background = { color: LIGHT_BG };
  s5.addText("Powered by ScrapeIQ", {
    x: 0.5, y: 0.9, w: 9, h: 0.8,
    fontSize: 28, bold: true, color: INDIGO, align: "center",
  });
  s5.addText("Group 20 — Vibe Coding Hackathon", {
    x: 0.5, y: 1.8, w: 9, h: 0.45,
    fontSize: 14, color: DARK, align: "center",
  });
  s5.addShape("line", { x: 1.5, y: 2.4, w: 7, h: 0, line: { color: "C7D2FE", width: 1 } });

  s5.addText([
    { text: "Sites Compared:\n", options: { bold: true, color: DARK } },
    { text: `${url1}\n`, options: { color: GRAY, fontSize: 10 } },
    { text: `${url2}\n\n`, options: { color: GRAY, fontSize: 10 } },
    { text: "Research Intent:\n", options: { bold: true, color: DARK } },
    { text: `${intent}\n\n`, options: { color: GRAY, fontSize: 11 } },
    { text: todayFull(), options: { color: GRAY, fontSize: 10 } },
  ], {
    x: 2, y: 2.6, w: 6, h: 2.3,
    fontSize: 12, align: "center",
  });

  pres.writeFile({ fileName: `scrapeiq-compare-${domain1}-vs-${domain2}-${slugDate()}.pptx` });
}
