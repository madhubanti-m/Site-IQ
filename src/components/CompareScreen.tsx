import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  GitCompare, Loader2, Save, CheckCircle2, Lightbulb,
  Trophy, Palette, Download, ChevronLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import Toast, { ToastMessage } from "./Toast";
import { extractSections, Section } from "./ExploreSections";
import { downloadComparePPT } from "../lib/pptExport";
import {
  CompareScreenState, CompareResult, DesignResult,
} from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const DESIGN_KEYWORDS = [
  "design", "layout", "ui", "ux", "visual", "color", "colour",
  "typography", "branding", "brand", "aesthetic", "look", "feel",
  "interface", "style", "font", "theme",
];

function hasDesignIntent(intent: string): boolean {
  return DESIGN_KEYWORDS.some((kw) => intent.toLowerCase().includes(kw));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function parseCompareResult(raw: string, domain1: string, domain2: string): CompareResult {
  const rows: CompareResult["rows"] = [];
  let keyInsight = "";
  let winner = "";
  let winnerWhy = "";

  const lines = raw.split("\n");
  let currentDim = "";
  let currentSite1 = "";
  let currentSite2 = "";
  let collectingInsight = false;
  const insightLines: string[] = [];

  for (const line of lines) {
    const dimMatch = line.match(/^DIMENSION\s+\d+:\s*(.+)/i);
    const site1Match = line.match(/^Site\s+1:\s*(.+)/i);
    const site2Match = line.match(/^Site\s+2:\s*(.+)/i);
    const winnerMatch = line.match(/^WINNER:\s*(.+)/i);
    const whyMatch = line.match(/^WHY:\s*(.+)/i);
    const insightMatch = line.match(/^KEY_INSIGHT:\s*(.*)/i);

    if (dimMatch) {
      collectingInsight = false;
      if (currentDim && currentSite1 && currentSite2) {
        rows.push({ dimension: currentDim, site1: currentSite1, site2: currentSite2 });
      }
      currentDim = dimMatch[1].trim();
      currentSite1 = "";
      currentSite2 = "";
    } else if (site1Match) {
      currentSite1 = site1Match[1].trim();
    } else if (site2Match) {
      currentSite2 = site2Match[1].trim();
    } else if (winnerMatch) {
      collectingInsight = false;
      if (currentDim && currentSite1 && currentSite2) {
        rows.push({ dimension: currentDim, site1: currentSite1, site2: currentSite2 });
        currentDim = "";
      }
      winner = winnerMatch[1].trim();
    } else if (whyMatch) {
      winnerWhy = whyMatch[1].trim();
    } else if (insightMatch) {
      collectingInsight = true;
      if (insightMatch[1].trim()) insightLines.push(insightMatch[1].trim());
    } else if (collectingInsight && line.trim()) {
      insightLines.push(line.trim());
    }
  }

  if (currentDim && currentSite1 && currentSite2) {
    rows.push({ dimension: currentDim, site1: currentSite1, site2: currentSite2 });
  }
  keyInsight = insightLines.join(" ");
  return { rows, keyInsight, winner, winnerWhy, domain1, domain2 };
}

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function extractDesignPoints(analysis: string): string[] {
  const lines = analysis.split("\n").filter((l) => l.trim().length > 0);
  const points: string[] = [];
  for (const line of lines) {
    const clean = line.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").trim();
    if (clean.length > 10 && points.length < 3) points.push(clean);
  }
  return points;
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-indigo-800">{children}</strong>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-indigo-600 mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-indigo-600 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-bold text-indigo-600 mb-1">{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 my-2">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
};

interface SectionChipRowProps {
  label: string;
  sections: Section[];
  loadingSection: string | null;
  activeSection: string | null;
  onSectionClick: (section: Section) => void;
}

function SectionChipRow({ label, sections, loadingSection, activeSection, onSectionClick }: SectionChipRowProps) {
  if (sections.length < 2) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const isLoading = loadingSection === section.url;
          const isActive = activeSection === section.url;
          return (
            <button
              key={section.url}
              type="button"
              onClick={(e) => { e.preventDefault(); onSectionClick(section); }}
              disabled={loadingSection !== null}
              style={{
                height: "30px", borderRadius: "20px", padding: "0 12px", fontSize: "11px",
                fontWeight: 500, border: "1px solid #6366f1",
                background: isActive ? "#6366f1" : "white",
                color: isActive ? "white" : "#6366f1",
                display: "inline-flex", alignItems: "center", gap: "5px",
                cursor: loadingSection !== null ? "not-allowed" : "pointer",
                opacity: loadingSection !== null && !isLoading ? 0.5 : 1,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loadingSection && !isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = "#EEF2FF";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
              }}
            >
              {isLoading && <Loader2 size={11} className="animate-spin" />}
              {section.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CompareScreenProps {
  compareState: CompareScreenState;
  setCompareState: React.Dispatch<React.SetStateAction<CompareScreenState>>;
}

export default function CompareScreen({ compareState, setCompareState }: CompareScreenProps) {
  const [loading, setLoading] = useState(false);
  const [designLoading, setDesignLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingChip, setLoadingChip] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const {
    url1, url2, intent, result, originalResult, rawResult, designResult,
    content1, content2, originalContent1, originalContent2,
    links1, links2, activeChip1, activeChip2, compareBreadcrumb, saved,
  } = compareState;

  const sections1 = extractSections(links1, url1);
  const sections2 = extractSections(links2, url2);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function update(partial: Partial<CompareScreenState>) {
    setCompareState((prev) => ({ ...prev, ...partial }));
  }

  async function scrapeUrl(url: string): Promise<{ markdown: string; links: string[] }> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Scrape failed");
    return { markdown: data.data?.markdown ?? data.data?.content ?? "", links: data.data?.links ?? [] };
  }

  async function runComparison(c1: string, c2: string, u1: string, u2: string, int: string): Promise<{ parsed: CompareResult; raw: string }> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/compare`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url1: u1, url2: u2, content1: c1, content2: c2, intent: int }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Comparison failed");
    const raw: string = data.result ?? "";
    const d1: string = data.domain1 ?? getDomain(u1);
    const d2: string = data.domain2 ?? getDomain(u2);
    return { parsed: parseCompareResult(raw, d1, d2), raw };
  }

  async function handleCompare(e: React.MouseEvent) {
    e.preventDefault();
    setError("");
    setSaveError("");
    update({
      result: null, originalResult: null, designResult: null, rawResult: "",
      content1: "", content2: "", originalContent1: "", originalContent2: "",
      links1: [], links2: [], activeChip1: null, activeChip2: null,
      compareBreadcrumb: null, saved: false,
    });

    if (!url1.trim() || !url2.trim()) {
      setError("Please enter both URLs.");
      return;
    }

    setLoading(true);
    try {
      const [s1, s2] = await Promise.all([scrapeUrl(url1), scrapeUrl(url2)]);
      const { parsed, raw } = await runComparison(s1.markdown, s2.markdown, url1, url2, intent);

      update({
        content1: s1.markdown, content2: s2.markdown,
        originalContent1: s1.markdown, originalContent2: s2.markdown,
        links1: s1.links, links2: s2.links,
        result: parsed, originalResult: parsed, rawResult: raw,
      });

      if (hasDesignIntent(intent)) {
        setDesignLoading(true);
        try {
          const dr = await fetch(`${SUPABASE_URL}/functions/v1/design-compare`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url1, url2, domain1: parsed.domain1, domain2: parsed.domain2 }),
          });
          const dd = await dr.json();
          if (dr.ok) update({ designResult: dd as DesignResult });
        } catch {
          // design is optional
        } finally {
          setDesignLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleChip1Click(section: Section) {
    setLoadingChip(section.url);
    try {
      const s = await scrapeUrl(section.url);
      const { parsed, raw } = await runComparison(s.markdown, originalContent2, url1, url2, intent);
      update({
        result: parsed, rawResult: raw, content1: s.markdown,
        activeChip1: section.url, activeChip2: null,
        compareBreadcrumb: `Comparing ${getDomain(url1)} ${section.name} vs ${getDomain(url2)} full page`,
      });
    } catch {
      addToast("Failed to load section.", "error");
    } finally {
      setLoadingChip(null);
    }
  }

  async function handleChip2Click(section: Section) {
    setLoadingChip(section.url);
    try {
      const s = await scrapeUrl(section.url);
      const { parsed, raw } = await runComparison(originalContent1, s.markdown, url1, url2, intent);
      update({
        result: parsed, rawResult: raw, content2: s.markdown,
        activeChip2: section.url, activeChip1: null,
        compareBreadcrumb: `Comparing ${getDomain(url1)} full page vs ${getDomain(url2)} ${section.name}`,
      });
    } catch {
      addToast("Failed to load section.", "error");
    } finally {
      setLoadingChip(null);
    }
  }

  function handleBackToFull(e: React.MouseEvent) {
    e.preventDefault();
    if (!originalResult) return;
    update({
      result: originalResult, content1: originalContent1, content2: originalContent2,
      activeChip1: null, activeChip2: null, compareBreadcrumb: null,
    });
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (!result) return;
    setSaving(true);
    setSaveError("");
    const { error: dbError } = await supabase.from("comparisons").insert({
      url1, url2, intent, comparison_result: rawResult, key_insight: result.keyInsight,
    });
    setSaving(false);
    if (dbError) {
      setSaveError(dbError.message);
      addToast("Save failed: " + dbError.message, "error");
    } else {
      update({ saved: true });
      addToast("Comparison saved!");
    }
  }

  function handleDownloadPPT(e: React.MouseEvent) {
    e.preventDefault();
    if (!result) return;
    downloadComparePPT({
      url1, url2,
      domain1: result.domain1, domain2: result.domain2,
      intent, keyInsight: result.keyInsight,
      rows: result.rows, winner: result.winner, winnerWhy: result.winnerWhy,
    });
    addToast("PPT downloaded");
  }

  const canDownloadPPT = Boolean(result?.keyInsight && result?.rows?.length > 0);
  const showSections = Boolean(result && (sections1.length >= 2 || sections2.length >= 2));

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-10 px-4">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <GitCompare size={15} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Compare Pages</h1>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL 1</label>
              <input
                type="url"
                value={url1}
                onChange={(e) => update({ url1: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL 2</label>
              <input
                type="url"
                value={url2}
                onChange={(e) => update({ url2: e.target.value })}
                placeholder="https://competitor.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">What are you comparing?</label>
            <input
              type="text"
              value={intent}
              onChange={(e) => update({ intent: e.target.value })}
              placeholder="e.g. pricing, features, design, messaging"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>}

          <button
            type="button"
            onClick={handleCompare}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Comparing pages...</>
            ) : (
              <><GitCompare size={16} /> Compare Now</>
            )}
          </button>
        </div>

        {result && (
          <>
            {result.keyInsight && (
              <div className="rounded-2xl p-5 shadow-sm" style={{ background: "#EEF2FF", borderLeft: "4px solid #6366f1" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                    <Lightbulb size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Key Insight</span>
                </div>
                <div style={{ lineHeight: 1.6 }}>
                  <ReactMarkdown components={mdComponents}>{result.keyInsight}</ReactMarkdown>
                </div>
              </div>
            )}

            {result.rows.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <GitCompare size={15} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-800">Comparison</span>
                  <span className="ml-auto text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                    {result.domain1} vs {result.domain2}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-indigo-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider w-40">Dimension</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{result.domain1}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{result.domain2}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#EEF2FF" }}>
                          <td className="px-4 py-3 text-xs font-semibold text-indigo-700 align-top whitespace-nowrap border-r border-gray-100">{row.dimension}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 align-top leading-relaxed">{row.site1}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 align-top leading-relaxed">{row.site2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.winner && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy size={15} className="text-white" />
                </div>
                <p className="text-sm font-bold text-indigo-700">
                  Winner: {result.winner}
                  {result.winnerWhy && <span className="font-normal text-indigo-600"> — {result.winnerWhy}</span>}
                </p>
              </div>
            )}

            {hasDesignIntent(intent) && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                    <Palette size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Design Comparison</span>
                </div>
                {designLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    Analysing designs...
                  </div>
                ) : designResult ? (
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {[designResult.site1, designResult.site2].map((site, idx) => {
                        const points = extractDesignPoints(site.analysis);
                        return (
                          <div key={idx} className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-800">{site.domain}</h3>
                            {site.screenshot && (
                              <div className="rounded-xl overflow-hidden border border-gray-100">
                                <img src={site.screenshot} alt={`${site.domain} screenshot`}
                                  className="w-full object-cover object-top" style={{ maxHeight: "150px" }} />
                              </div>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${scoreColor(site.score)}`}>
                              Design Score: {site.score}/10
                            </span>
                            <ul className="space-y-1.5">
                              {points.map((pt, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm font-bold text-indigo-700">
                        Design Winner: {designResult.designWinner}
                        <span className="font-normal text-indigo-600"> — {designResult.winnerReason}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-gray-400 text-center">Design analysis unavailable.</div>
                )}
              </div>
            )}

            {showSections && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
                {compareBreadcrumb && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{compareBreadcrumb}</span>
                    <button
                      type="button"
                      onClick={handleBackToFull}
                      className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-medium transition-colors ml-2"
                    >
                      <ChevronLeft size={12} />
                      Back to full comparison
                    </button>
                  </div>
                )}
                {loadingChip && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600">
                    <Loader2 size={12} className="animate-spin" />
                    Re-comparing with selected section...
                  </div>
                )}
                <SectionChipRow
                  label={`${getDomain(url1)} — explore sections:`}
                  sections={sections1}
                  loadingSection={loadingChip}
                  activeSection={activeChip1}
                  onSectionClick={handleChip1Click}
                />
                <SectionChipRow
                  label={`${getDomain(url2)} — explore sections:`}
                  sections={sections2}
                  loadingSection={loadingChip}
                  activeSection={activeChip2}
                  onSectionClick={handleChip2Click}
                />
              </div>
            )}

            {saveError && <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{saveError}</p>}

            <div className="flex flex-col sm:flex-row gap-3">
              {canDownloadPPT && (
                <button
                  type="button"
                  onClick={handleDownloadPPT}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  <Download size={15} />
                  Download PPT
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {saved ? (
                  <><CheckCircle2 size={16} /> Saved!</>
                ) : (
                  <><Save size={16} /> {saving ? "Saving..." : "Save Comparison"}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
