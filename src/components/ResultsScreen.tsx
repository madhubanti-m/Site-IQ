import { useState, useEffect } from "react";
import { Sparkles, Brain, Link2, ChevronDown, ChevronUp, Save, RotateCcw, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ScrapeResult } from "../types";

interface ResultsScreenProps {
  result: Omit<ScrapeResult, "id" | "created_at">;
  onScrapeAnother: () => void;
  onSaved: () => void;
}

function parseBullets(summary: string): string[] {
  return summary
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

interface AnalysisSection {
  label: string;
  content: string;
}

function parseAnalysis(analysis: string): AnalysisSection[] {
  if (!analysis) return [];
  const sections: AnalysisSection[] = [];
  const patterns = [
    { key: "1.", label: "What Is This Page About" },
    { key: "2.", label: "Key Takeaways" },
    { key: "3.", label: "Who Is This Useful For" },
    { key: "4.", label: "Overall Sentiment" },
  ];

  const lines = analysis.split("\n").filter(Boolean);
  let currentLabel = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const matched = patterns.find((p) => line.trim().startsWith(p.key));
    if (matched) {
      if (currentLabel) {
        sections.push({ label: currentLabel, content: currentLines.join("\n").trim() });
      }
      currentLabel = matched.label;
      const afterNum = line.replace(/^\d+\.\s*/, "").replace(/^[A-Z\s—]+—?\s*/i, "").trim();
      currentLines = afterNum ? [afterNum] : [];
    } else if (currentLabel) {
      currentLines.push(line);
    }
  }
  if (currentLabel) {
    sections.push({ label: currentLabel, content: currentLines.join("\n").trim() });
  }

  if (sections.length === 0 && analysis.trim()) {
    return [{ label: "Analysis", content: analysis.trim() }];
  }
  return sections;
}

function getSentimentBadge(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes("positive")) return "text-green-700 bg-green-50 border border-green-200";
  if (lower.includes("negative")) return "text-red-700 bg-red-50 border border-red-200";
  return "text-yellow-700 bg-yellow-50 border border-yellow-200";
}

export default function ResultsScreen({ result, onScrapeAnother, onSaved }: ResultsScreenProps) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const bullets = parseBullets(result.summary);
  const analysisSections = parseAnalysis(result.analysis);

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    const payload = {
      url: result.url,
      intent: result.intent,
      title: result.title,
      content: result.content,
      links: result.links,
      summary: result.summary,
      analysis: result.analysis,
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
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {result.title}
          </h1>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 mt-1 transition-colors"
          >
            {result.url}
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
              {result.intent}
            </span>
          </div>
          <ul className="space-y-3">
            {bullets.length > 0 ? bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{bullet}</span>
              </li>
            )) : (
              <li className="text-sm text-gray-500 italic">No insights generated.</li>
            )}
          </ul>
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

          {analysisSections.length > 0 ? (
            <div className="space-y-4">
              {analysisSections.map((section, i) => (
                <div key={i}>
                  {i > 0 && <hr className="border-indigo-100 mb-4" />}
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1.5">
                    {section.label}
                  </p>
                  {section.label === "Overall Sentiment" ? (
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSentimentBadge(section.content)}`}>
                      {section.content}
                    </span>
                  ) : section.label === "Key Takeaways" ? (
                    <ul className="space-y-1.5">
                      {section.content.split("\n").filter(Boolean).map((line, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          {line.replace(/^[-•*\d.]\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 italic">
              <Loader2 size={14} className="animate-spin" />
              Generating smart analysis...
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Full Page Content</p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
            <pre className="px-6 py-4 text-xs text-gray-600 font-mono whitespace-pre-wrap bg-gray-50">
              {result.content}
            </pre>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setLinksOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link2 size={15} className="text-indigo-500" />
              Links found
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {result.links.length}
              </span>
            </div>
            {linksOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </button>
          {linksOpen && (
            <div className="border-t border-gray-100 max-h-52 overflow-y-auto">
              {result.links.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-400">No links found.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {result.links.map((link, i) => (
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
            onClick={handleSave}
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
            onClick={onScrapeAnother}
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
