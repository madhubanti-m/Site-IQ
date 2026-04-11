import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, Brain, Link2, Save, RotateCcw, ExternalLink,
  CheckCircle2, Loader2, ChevronRight, Download,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { ScrapeResult, ScrapeScreenState } from "../types";
import ExploreSections, { Section, extractSections } from "./ExploreSections";
import Toast, { ToastMessage } from "./Toast";
import { downloadScrapePPT } from "../lib/pptExport";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const mdComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ color: "var(--accent-violet-light)" }} className="text-sm font-bold mb-2 mt-4 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ color: "var(--accent-violet-light)" }} className="text-sm font-bold mb-1.5 mt-3 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: "var(--text-primary)" }} className="font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 my-2 list-none pl-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ color: "var(--text-secondary)" }} className="flex items-start gap-2 text-sm leading-relaxed">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-violet)" }} />
      <span>{children}</span>
    </li>
  ),
};

interface ResultsScreenProps {
  scrapeState: ScrapeScreenState;
  setScrapeState: React.Dispatch<React.SetStateAction<ScrapeScreenState>>;
  onScrapeAnother: () => void;
  onHistoryAdded: () => void;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function ResultsScreen({
  scrapeState,
  setScrapeState,
  onScrapeAnother,
  onHistoryAdded,
}: ResultsScreenProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  const { result, currentResult, breadcrumb, activeSection, saved } = scrapeState;

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (result) {
      setSections(extractSections(result.links ?? [], result.url));
      setSaveError("");
    }
  }, [result]);

  const displayResult = currentResult ?? result;

  async function handleSectionClick(section: Section) {
    if (!result) return;
    setLoadingSection(section.url);
    try {
      const scrapeRes = await fetch(`${SUPABASE_URL}/functions/v1/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ url: section.url }),
      });
      if (!scrapeRes.ok) throw new Error("Scraping failed");
      const scrapeData = await scrapeRes.json();
      const content: string = scrapeData.data?.markdown ?? "";
      const title: string = scrapeData.data?.metadata?.title ?? section.url;
      const links: string[] = scrapeData.data?.links ?? [];

      const [analyzeRes, smartRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ intent: result.intent, content }),
        }),
        fetch(`${SUPABASE_URL}/functions/v1/smart-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ content }),
        }),
      ]);

      const { summary } = analyzeRes.ok ? await analyzeRes.json() : { summary: "" };
      const { analysis } = smartRes.ok ? await smartRes.json() : { analysis: "" };

      setScrapeState((prev) => ({
        ...prev,
        currentResult: { url: section.url, intent: result.intent, title, content, links, summary, analysis },
        breadcrumb: { domain: getDomain(result.url), section: section.name },
        activeSection: section.url,
        saved: false,
      }));
    } catch {
      addToast("Failed to load section.", "error");
    } finally {
      setLoadingSection(null);
    }
  }

  function handleBack() {
    setScrapeState((prev) => ({
      ...prev,
      currentResult: prev.result,
      breadcrumb: null,
      activeSection: null,
      saved: false,
    }));
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (!displayResult) return;
    setSaving(true);
    setSaveError("");

    const { error } = await supabase.from("scrape_results").insert({
      url: displayResult.url,
      intent: displayResult.intent,
      title: displayResult.title,
      content: displayResult.content,
      links: displayResult.links,
      summary: displayResult.summary,
      analysis: displayResult.analysis,
    }).select();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      addToast("Save failed: " + error.message, "error");
    } else {
      setScrapeState((prev) => ({ ...prev, saved: true }));
      addToast("Saved to History!");
      onHistoryAdded();
    }
  }

  function handleDownloadPPT(e: React.MouseEvent) {
    e.preventDefault();
    if (!displayResult?.summary || !displayResult?.analysis) return;
    downloadScrapePPT({
      title: displayResult.title,
      url: displayResult.url,
      intent: displayResult.intent,
      summary: displayResult.summary,
      analysis: displayResult.analysis,
    });
    addToast("PPT downloaded");
  }

  if (!displayResult) return null;

  const canDownloadPPT = Boolean(displayResult.title && displayResult.summary && displayResult.analysis);

  return (
    <div
      className="py-10 px-4 relative"
      style={{ minHeight: "calc(100vh - 56px)", background: "var(--bg-base)" }}
    >
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{breadcrumb.domain}</span>
              <ChevronRight size={12} />
              <span className="font-medium" style={{ color: "var(--accent-violet-light)" }}>{breadcrumb.section}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {displayResult.title}
          </h1>
          <a
            href={displayResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm mt-1 transition-colors"
            style={{ color: "var(--accent-violet-light)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-cyan)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent-violet-light)")}
          >
            {displayResult.url}
            <ExternalLink size={12} />
          </a>
        </div>

        <hr style={{ borderColor: "var(--border-subtle)" }} />

        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.25)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "var(--accent-violet)" }}
            >
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              AI Insight — based on your goal
            </span>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                color: "var(--accent-violet-light)",
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              {displayResult.intent}
            </span>
          </div>
          <div style={{ lineHeight: 1.6 }}>
            {displayResult.summary ? (
              <ReactMarkdown components={mdComponents}>{displayResult.summary}</ReactMarkdown>
            ) : (
              <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>No insights generated.</p>
            )}
          </div>
        </div>

        <hr style={{ borderColor: "var(--border-subtle)" }} />

        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(34,211,238,0.05)",
            border: "1px solid rgba(34,211,238,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "rgba(34,211,238,0.2)", border: "1px solid rgba(34,211,238,0.3)" }}
            >
              <Brain size={13} style={{ color: "var(--accent-cyan)" }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Smart Analysis</span>
          </div>
          {displayResult.analysis ? (
            <div style={{ lineHeight: 1.6 }}>
              <ReactMarkdown components={mdComponents}>{displayResult.analysis}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm italic" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent-violet)" }} />
              Generating smart analysis...
            </div>
          )}
        </div>

        <hr style={{ borderColor: "var(--border-subtle)" }} />

        <ExploreSections
          sections={sections}
          loadingSection={loadingSection}
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          breadcrumb={breadcrumb}
          onBack={handleBack}
        />

        {sections.length >= 2 && <hr style={{ borderColor: "var(--border-subtle)" }} />}

        <div
          className="flex items-center gap-2 text-sm rounded-xl px-4 py-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <Link2 size={14} style={{ color: "var(--accent-violet-light)", flexShrink: 0 }} />
          <span className="font-medium">{displayResult.links.length} links found on this page</span>
        </div>

        {saveError && (
          <p
            className="text-sm px-4 py-2.5 rounded-lg"
            style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            {saveError}
          </p>
        )}

        <div className="flex gap-3">
          {canDownloadPPT && (
            <button
              type="button"
              onClick={handleDownloadPPT}
              className="btn-ghost flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm"
            >
              <Download size={15} />
              Download PPT
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saved ? (
              <><CheckCircle2 size={16} /> Saved!</>
            ) : (
              <><Save size={16} /> {saving ? "Saving..." : "Save to History"}</>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onScrapeAnother(); }}
            className="flex-1 btn-ghost flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
          >
            <RotateCcw size={16} />
            Scrape Another
          </button>
        </div>
      </div>
    </div>
  );
}
