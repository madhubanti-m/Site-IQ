import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { GitCompare, Loader2, Save, CheckCircle2, Lightbulb } from "lucide-react";
import { supabase } from "../lib/supabase";

interface CompareResult {
  tableMarkdown: string;
  keyInsight: string;
  domain1: string;
  domain2: string;
  winnerDomain: string | null;
}

const tableComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-indigo-50">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-gray-100">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-2.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider border-b border-indigo-100">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-2.5 text-sm text-gray-700 align-top leading-relaxed">{children}</td>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
};

const insightComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
};

function extractSections(raw: string): { tableMarkdown: string; keyInsight: string } {
  const insightMatch = raw.match(/##\s*Key Insight\s*\n([\s\S]*)/i);
  const keyInsight = insightMatch ? insightMatch[1].trim() : "";
  const tableMarkdown = insightMatch ? raw.slice(0, insightMatch.index).trim() : raw.trim();
  return { tableMarkdown, keyInsight };
}

function detectWinner(raw: string, domain1: string, domain2: string): string | null {
  const winnerRow = raw.match(/Overall Winner[^\n]*\|([^\|]+)\|([^\|]+)/i);
  if (!winnerRow) return null;
  const col1 = winnerRow[1].toLowerCase();
  const col2 = winnerRow[2].toLowerCase();
  if (col1.includes("✓") || col1.includes("winner") || col1.includes("yes")) return domain1;
  if (col2.includes("✓") || col2.includes("winner") || col2.includes("yes")) return domain2;
  return null;
}

export default function CompareScreen() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [rawResult, setRawResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  async function scrapeUrl(url: string): Promise<string> {
    const res = await fetch(`${supabaseUrl}/functions/v1/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Scrape failed");
    return data.data?.markdown ?? data.data?.content ?? "";
  }

  async function handleCompare() {
    setError("");
    setResult(null);
    setSaved(false);
    setSaveError("");

    if (!url1.trim() || !url2.trim()) {
      setError("Please enter both URLs.");
      return;
    }

    setLoading(true);
    try {
      const [content1, content2] = await Promise.all([scrapeUrl(url1), scrapeUrl(url2)]);

      const res = await fetch(`${supabaseUrl}/functions/v1/compare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url1, url2, content1, content2, intent }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed");

      const raw: string = data.result ?? "";
      const domain1: string = data.domain1 ?? new URL(url1).hostname;
      const domain2: string = data.domain2 ?? new URL(url2).hostname;
      const { tableMarkdown, keyInsight } = extractSections(raw);
      const winnerDomain = detectWinner(raw, domain1, domain2);

      setRawResult(raw);
      setResult({ tableMarkdown, keyInsight, domain1, domain2, winnerDomain });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setSaveError("");
    const { error: dbError } = await supabase.from("comparisons").insert({
      url1,
      url2,
      intent,
      comparison_result: rawResult,
    });
    setSaving(false);
    if (dbError) {
      setSaveError(dbError.message);
    } else {
      setSaved(true);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-10 px-4">
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
                onChange={(e) => setUrl1(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL 2</label>
              <input
                type="url"
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                placeholder="https://competitor.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              What are you comparing?
            </label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. pricing, features, messaging"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleCompare}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Comparing pages...
              </>
            ) : (
              <>
                <GitCompare size={16} />
                Compare Now
              </>
            )}
          </button>
        </div>

        {result && (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <GitCompare size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold text-gray-800">Comparison</span>
                <span className="ml-auto text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                  {result.domain1} vs {result.domain2}
                </span>
              </div>
              <div className="p-6">
                <ReactMarkdown components={tableComponents}>
                  {result.tableMarkdown}
                </ReactMarkdown>
              </div>
            </div>

            {result.keyInsight && (
              <div
                className="rounded-2xl p-5 shadow-sm"
                style={{ background: "#EEF2FF", borderLeft: "4px solid #6366f1" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                    <Lightbulb size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Key Insight</span>
                </div>
                <ReactMarkdown components={insightComponents}>
                  {result.keyInsight}
                </ReactMarkdown>
              </div>
            )}

            {saveError && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {saved ? (
                <>
                  <CheckCircle2 size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Comparison"}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
