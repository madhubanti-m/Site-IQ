import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Brain, Link2, ChevronDown, ChevronUp, Save, RotateCcw, ExternalLink, CheckCircle2, Loader2, ChevronRight } from "lucide-react";

import { supabase } from "../lib/supabase";
import { ScrapeResult } from "../types";
import ExploreSections, { Section } from "./ExploreSections";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const mdComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-indigo-600 mb-2 mt-4 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-bold text-indigo-500 mb-1.5 mt-3 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 my-2 list-none pl-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
};

interface ResultsScreenProps {
  result: Omit<ScrapeResult, "id" | "created_at">;
  onScrapeAnother: () => void;
  onSaved: () => void;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ResultsScreen({ result, onScrapeAnother, onSaved }: ResultsScreenProps) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState(result);
  const [breadcrumb, setBreadcrumb] = useState<{ domain: string; section: string } | null>(null);

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  useEffect(() => {
    setCurrentResult(result);
    setBreadcrumb(null);
    setSections([]);
    fetchSections(result.url, result.links);
  }, [result]);

  async function fetchSections(url: string, links: string[]) {
    if (!links || links.length === 0) return;
    setSectionsLoading(true);
    try {
      const domain = getDomain(url);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/explore-sections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ links, domain }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections(Array.isArray(data.sections) ? data.sections : []);
      }
    } catch {
      setSections([]);
    } finally {
      setSectionsLoading(false);
    }
  }

  async function handleSectionClick(section: Section) {
    setLoadingSection(section.url);
    try {
      const scrapeRes = await fetch(`${SUPABASE_URL}/functions/v1/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ intent: result.intent, content }),
        }),
        fetch(`${SUPABASE_URL}/functions/v1/smart-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ content }),
        }),
      ]);

      const { summary } = analyzeRes.ok ? await analyzeRes.json() : { summary: "" };
      const { analysis } = smartRes.ok ? await smartRes.json() : { analysis: "" };

      setCurrentResult({
        url: section.url,
        intent: result.intent,
        title,
        content,
        links,
        summary,
        analysis,
      });
      setBreadcrumb({ domain: getDomain(result.url), section: section.name });
      setSaved(false);
      setSaveError("");
      setLinksOpen(false);
    } catch {
    } finally {
      setLoadingSection(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    const payload = {
      url: currentResult.url,
      intent: currentResult.intent,
      title: currentResult.title,
      content: currentResult.content,
      links: currentResult.links,
      summary: currentResult.summary,
      analysis: currentResult.analysis,
    };

    const { data, error } = await supabase
      .from("scrape_results")
      .insert(payload)
      .select();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      console.log("Saved successfully", data);
      setSaved(true);
      setShowToast(true);
      setTimeout(() => onSaved(), 1500);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-10 px-4 relative">
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg">
          <CheckCircle2 size={16} />
          Saved!
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <span className="font-medium text-gray-500">{breadcrumb.domain}</span>
              <ChevronRight size={12} />
              <span className="font-medium text-indigo-600">{breadcrumb.section}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {currentResult.title}
          </h1>
          <a
            href={currentResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 mt-1 transition-colors"
          >
            {currentResult.url}
            <ExternalLink size={12} />
          </a>
        </div>

        <hr className="border-gray-200" />

        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{ background: "#EEF2FF", borderLeft: "4px solid #6366f1" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">AI Insight — based on your goal</span>
            <span className="ml-auto text-xs text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
              {currentResult.intent}
            </span>
          </div>
          <div className="leading-relaxed" style={{ lineHeight: 1.6 }}>
            {currentResult.summary ? (
              <ReactMarkdown components={mdComponents}>{currentResult.summary}</ReactMarkdown>
            ) : (
              <p className="text-sm text-gray-500 italic">No insights generated.</p>
            )}
          </div>
        </div>

        <hr className="border-gray-200" />

        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{ background: "#F5F3FF", borderLeft: "4px solid #6366f1" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center">
              <Brain size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Smart Analysis</span>
          </div>

          {currentResult.analysis ? (
            <div style={{ lineHeight: 1.6 }}>
              <ReactMarkdown components={mdComponents}>{currentResult.analysis}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 italic">
              <Loader2 size={14} className="animate-spin" />
              Generating smart analysis...
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        {sectionsLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            Finding sections...
          </div>
        ) : (
          <ExploreSections
            sections={sections}
            loadingSection={loadingSection}
            onSectionClick={handleSectionClick}
          />
        )}

        {(sections.length > 0 || sectionsLoading) && <hr className="border-gray-200" />}

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setLinksOpen((v) => !v); }}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link2 size={15} className="text-indigo-500" />
              Links found
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {currentResult.links.length}
              </span>
            </div>
            {linksOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </button>
          {linksOpen && (
            <div className="border-t border-gray-100 max-h-52 overflow-y-auto">
              {currentResult.links.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-400">No links found.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {currentResult.links.map((link, i) => (
                    <li key={i}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-2.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors truncate"
                      >
                        <ExternalLink size={11} className="flex-shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {saveError && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{saveError}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleSave(); }}
            disabled={saving || saved}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {saved ? (
              <>
                <CheckCircle2 size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                {saving ? "Saving..." : "Save to History"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onScrapeAnother(); }}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-indigo-50 border-2 border-indigo-600 text-indigo-600 font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            <RotateCcw size={16} />
            Scrape Another
          </button>
        </div>
      </div>
    </div>
  );
}
