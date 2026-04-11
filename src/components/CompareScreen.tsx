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
import { CompareScreenState, CompareResult, DesignResult } from "../types";

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
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
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
      if (currentDim && currentSite1 && currentSite2)
        rows.push({ dimension: currentDim, site1: currentSite1, site2: currentSite2 });
      currentDim = dimMatch[1].trim(); currentSite1 = ""; currentSite2 = "";
    } else if (site1Match) { currentSite1 = site1Match[1].trim(); }
    else if (site2Match) { currentSite2 = site2Match[1].trim(); }
    else if (winnerMatch) {
      collectingInsight = false;
      if (currentDim && currentSite1 && currentSite2) {
        rows.push({ dimension: currentDim, site1: currentSite1, site2: currentSite2 });
        currentDim = "";
      }
      winner = winnerMatch[1].trim();
    } else if (whyMatch) { winnerWhy = whyMatch[1].trim(); }
    else if (insightMatch) {
      collectingInsight = true;
      if (insightMatch[1].trim()) insightLines.push(insightMatch[1].trim());
    } else if (collectingInsight && line.trim()) { insightLines.push(line.trim()); }
  }
  if (currentDim && currentSite1 && currentSite2)
    rows.push({ dimension: currentDim, site1: currentSite1, site2: currentSite2 });
  keyInsight = insightLines.join(" ");
  return { rows, keyInsight, winner, winnerWhy, domain1, domain2 };
}

function scoreColor(score: number): string {
  if (score >= 7) return "rgba(34,197,94,0.15)";
  if (score >= 5) return "rgba(234,179,8,0.15)";
  return "rgba(239,68,68,0.15)";
}

function scoreTextColor(score: number): string {
  if (score >= 7) return "#4ade80";
  if (score >= 5) return "#facc15";
  return "#f87171";
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
    <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: "var(--text-primary)" }} className="font-semibold">{children}</strong>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ color: "var(--accent-violet-light)" }} className="text-base font-bold mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ color: "var(--accent-violet-light)" }} className="text-sm font-bold mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ color: "var(--accent-violet-light)" }} className="text-sm font-bold mb-1">{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 my-2">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ color: "var(--text-secondary)" }} className="flex items-start gap-2 text-sm leading-relaxed">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-violet)" }} />
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
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
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
                fontWeight: 500,
                border: isActive ? "none" : "1px solid var(--border)",
                background: isActive ? "linear-gradient(135deg, #7c3aed, #8b5cf6)" : "transparent",
                color: isActive ? "white" : "var(--accent-violet-light)",
                display: "inline-flex", alignItems: "center", gap: "5px",
                cursor: loadingSection !== null ? "not-allowed" : "pointer",
                opacity: loadingSection !== null && !isLoading ? 0.5 : 1,
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
                boxShadow: isActive ? "0 0 12px rgba(139,92,246,0.35)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!loadingSection && !isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-violet-light)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                }
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
    setError(""); setSaveError("");
    update({
      result: null, originalResult: null, designResult: null, rawResult: "",
      content1: "", content2: "", originalContent1: "", originalContent2: "",
      links1: [], links2: [], activeChip1: null, activeChip2: null,
      compareBreadcrumb: null, saved: false,
    });
    if (!url1.trim() || !url2.trim()) { setError("Please enter both URLs."); return; }
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
        } catch { /* design is optional */ } finally { setDesignLoading(false); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  async function handleChip1Click(section: Section) {
    setLoadingChip(section.url);
    try {
      const s = await scrapeUrl(section.url);
      const { parsed, raw } = await runComparison(s.markdown, originalContent2, url1, url2, intent);
      update({ result: parsed, rawResult: raw, content1: s.markdown, activeChip1: section.url, activeChip2: null,
        compareBreadcrumb: `Comparing ${getDomain(url1)} ${section.name} vs ${getDomain(url2)} full page` });
    } catch { addToast("Failed to load section.", "error"); } finally { setLoadingChip(null); }
  }

  async function handleChip2Click(section: Section) {
    setLoadingChip(section.url);
    try {
      const s = await scrapeUrl(section.url);
      const { parsed, raw } = await runComparison(originalContent1, s.markdown, url1, url2, intent);
      update({ result: parsed, rawResult: raw, content2: s.markdown, activeChip2: section.url, activeChip1: null,
        compareBreadcrumb: `Comparing ${getDomain(url1)} full page vs ${getDomain(url2)} ${section.name}` });
    } catch { addToast("Failed to load section.", "error"); } finally { setLoadingChip(null); }
  }

  function handleBackToFull(e: React.MouseEvent) {
    e.preventDefault();
    if (!originalResult) return;
    update({ result: originalResult, content1: originalContent1, content2: originalContent2,
      activeChip1: null, activeChip2: null, compareBreadcrumb: null });
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (!result) return;
    setSaving(true); setSaveError("");
    const { error: dbError } = await supabase.from("comparisons").insert({
      url1, url2, intent, comparison_result: rawResult, key_insight: result.keyInsight,
    });
    setSaving(false);
    if (dbError) { setSaveError(dbError.message); addToast("Save failed: " + dbError.message, "error"); }
    else { update({ saved: true }); addToast("Comparison saved!"); }
  }

  function handleDownloadPPT(e: React.MouseEvent) {
    e.preventDefault();
    if (!result) return;
    downloadComparePPT({ url1, url2, domain1: result.domain1, domain2: result.domain2,
      intent, keyInsight: result.keyInsight, rows: result.rows, winner: result.winner, winnerWhy: result.winnerWhy });
    addToast("PPT downloaded");
  }

  const canDownloadPPT = Boolean(result?.keyInsight && result?.rows?.length > 0);
  const showSections = Boolean(result && (sections1.length >= 2 || sections2.length >= 2));

  const inputClass = "input-dark w-full px-3.5 py-2.5 rounded-xl text-sm";
  const labelStyle = { color: "var(--text-secondary)", fontSize: "12px", fontWeight: 600, marginBottom: "6px", display: "block" };

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: "var(--bg-base)" }} className="py-10 px-4">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
          >
            <GitCompare size={15} className="text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Compare Pages</h1>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>URL 1</label>
              <input type="url" value={url1} onChange={(e) => update({ url1: e.target.value })}
                placeholder="https://example.com" className={inputClass} />
            </div>
            <div>
              <label style={labelStyle}>URL 2</label>
              <input type="url" value={url2} onChange={(e) => update({ url2: e.target.value })}
                placeholder="https://competitor.com" className={inputClass} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>What are you comparing?</label>
            <input type="text" value={intent} onChange={(e) => update({ intent: e.target.value })}
              placeholder="e.g. pricing, features, design, messaging" className={inputClass} />
          </div>
          {error && (
            <p className="text-sm px-4 py-2.5 rounded-lg"
              style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </p>
          )}
          <button type="button" onClick={handleCompare} disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Comparing pages...</>
              : <><GitCompare size={16} /> Compare Now</>
            }
          </button>
        </div>

        {result && (
          <>
            {result.keyInsight && (
              <div className="rounded-2xl p-5"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "var(--accent-violet)" }}>
                    <Lightbulb size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Key Insight</span>
                </div>
                <div style={{ lineHeight: 1.6 }}>
                  <ReactMarkdown components={mdComponents}>{result.keyInsight}</ReactMarkdown>
                </div>
              </div>
            )}

            {result.rows.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                <div className="px-6 py-4 flex items-center gap-2"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <GitCompare size={15} style={{ color: "var(--accent-violet-light)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Comparison</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: "var(--accent-violet-light)", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    {result.domain1} vs {result.domain2}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider w-40">Dimension</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{result.domain1}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{result.domain2}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-panel)" }}>
                          <td className="px-4 py-3 text-xs font-semibold align-top whitespace-nowrap"
                            style={{ color: "var(--accent-violet-light)", borderRight: "1px solid var(--border)" }}>
                            {row.dimension}
                          </td>
                          <td className="px-4 py-3 text-sm align-top leading-relaxed" style={{ color: "var(--text-secondary)" }}>{row.site1}</td>
                          <td className="px-4 py-3 text-sm align-top leading-relaxed" style={{ color: "var(--text-secondary)" }}>{row.site2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.winner && (
              <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--accent-violet)" }}>
                  <Trophy size={15} className="text-white" />
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--accent-violet-light)" }}>
                  Winner: {result.winner}
                  {result.winnerWhy && <span className="font-normal" style={{ color: "var(--text-secondary)" }}> — {result.winnerWhy}</span>}
                </p>
              </div>
            )}

            {hasDesignIntent(intent) && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                <div className="px-6 py-4 flex items-center gap-2"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "var(--accent-violet)" }}>
                    <Palette size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Design Comparison</span>
                </div>
                {designLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: "var(--text-muted)" }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-violet)" }} />
                    Analysing designs...
                  </div>
                ) : designResult ? (
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {[designResult.site1, designResult.site2].map((site, idx) => {
                        const points = extractDesignPoints(site.analysis);
                        return (
                          <div key={idx} className="space-y-3">
                            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{site.domain}</h3>
                            {site.screenshot && (
                              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                                <img src={site.screenshot} alt={`${site.domain} screenshot`}
                                  className="w-full object-cover object-top" style={{ maxHeight: "150px" }} />
                              </div>
                            )}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{ background: scoreColor(site.score), color: scoreTextColor(site.score), border: `1px solid ${scoreTextColor(site.score)}40` }}>
                              Design Score: {site.score}/10
                            </span>
                            <ul className="space-y-1.5">
                              {points.map((pt, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-violet)" }} />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <p className="text-sm font-bold" style={{ color: "var(--accent-violet-light)" }}>
                        Design Winner: {designResult.designWinner}
                        <span className="font-normal" style={{ color: "var(--text-secondary)" }}> — {designResult.winnerReason}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Design analysis unavailable.</div>
                )}
              </div>
            )}

            {showSections && (
              <div className="rounded-2xl p-5 space-y-4"
                style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                {compareBreadcrumb && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{compareBreadcrumb}</span>
                    <button type="button" onClick={handleBackToFull}
                      className="flex items-center gap-1 font-medium transition-colors ml-2"
                      style={{ color: "var(--accent-violet-light)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-cyan)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent-violet-light)")}
                    >
                      <ChevronLeft size={12} /> Back to full comparison
                    </button>
                  </div>
                )}
                {loadingChip && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--accent-violet-light)" }}>
                    <Loader2 size={12} className="animate-spin" /> Re-comparing with selected section...
                  </div>
                )}
                <SectionChipRow label={`${getDomain(url1)} — explore sections:`} sections={sections1}
                  loadingSection={loadingChip} activeSection={activeChip1} onSectionClick={handleChip1Click} />
                <SectionChipRow label={`${getDomain(url2)} — explore sections:`} sections={sections2}
                  loadingSection={loadingChip} activeSection={activeChip2} onSectionClick={handleChip2Click} />
              </div>
            )}

            {saveError && (
              <p className="text-sm px-4 py-2.5 rounded-lg"
                style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                {saveError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {canDownloadPPT && (
                <button type="button" onClick={handleDownloadPPT}
                  className="flex-1 btn-ghost flex items-center justify-center gap-2 py-3 rounded-xl text-sm">
                  <Download size={15} /> Download PPT
                </button>
              )}
              <button type="button" onClick={handleSave} disabled={saving || saved}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {saved
                  ? <><CheckCircle2 size={16} /> Saved!</>
                  : <><Save size={16} /> {saving ? "Saving..." : "Save Comparison"}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
