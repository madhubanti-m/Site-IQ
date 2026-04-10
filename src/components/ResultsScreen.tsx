import { useState } from "react";
import { Sparkles, Link2, ChevronDown, ChevronUp, Save, RotateCcw, ExternalLink, CheckCircle2 } from "lucide-react";
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

export default function ResultsScreen({ result, onScrapeAnother, onSaved }: ResultsScreenProps) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const bullets = parseBullets(result.summary);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("scrape_results").insert({
      url: result.url,
      intent: result.intent,
      title: result.title,
      content: result.content,
      links: result.links,
      summary: result.summary,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      console.log("Saved successfully");
      setSaved(true);
      setTimeout(() => onSaved(), 1200);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight line-clamp-2">
            {result.title}
          </h2>
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

        <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">AI Insight based on your goal</span>
            <span className="ml-auto text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
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

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Full Page Content</p>
          </div>
          <textarea
            readOnly
            value={result.content}
            className="w-full h-52 px-6 py-4 text-xs text-gray-600 font-mono resize-none focus:outline-none bg-gray-50"
          />
        </div>

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
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            <RotateCcw size={16} />
            Scrape Another
          </button>
        </div>
      </div>
    </div>
  );
}
