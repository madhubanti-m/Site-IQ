import { useState } from "react";
import { Loader2, ArrowRight, Globe, Target } from "lucide-react";
import { ScrapeResult } from "../types";

interface HomeScreenProps {
  onResults: (result: Omit<ScrapeResult, "id" | "created_at">) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function HomeScreen({ onResults }: HomeScreenProps) {
  const [url, setUrl] = useState("");
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleScrape() {
    if (!url.trim() || !intent.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const scrapeRes = await fetch(`${SUPABASE_URL}/functions/v1/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json();
        throw new Error(err.error ?? "Scraping failed");
      }

      const scrapeData = await scrapeRes.json();
      const content: string = scrapeData.data?.markdown ?? "";
      const title: string = scrapeData.data?.metadata?.title ?? url;
      const links: string[] = scrapeData.data?.links ?? [];

      const [analyzeRes, smartRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ intent: intent.trim(), content }),
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

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error ?? "Analysis failed");
      }
      if (!smartRes.ok) {
        const err = await smartRes.json();
        throw new Error(err.error ?? "Smart analysis failed");
      }

      const { summary } = await analyzeRes.json();
      const { analysis } = await smartRes.json();

      onResults({
        url: url.trim(),
        intent: intent.trim(),
        title,
        content,
        links,
        summary,
        analysis,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Scrape<span className="text-indigo-600">IQ</span>
          </h1>
          <p className="text-gray-500 text-lg">Scrape smarter. Research faster.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Globe size={14} className="text-indigo-500" />
              Website URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any website URL"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 bg-gray-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Target size={14} className="text-indigo-500" />
              Research Intent
            </label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="What are you looking for? e.g. pricing strategy, key features"
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 bg-gray-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleScrape}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing page...
              </>
            ) : (
              <>
                Scrape & Analyze
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Firecrawl + Claude AI
        </p>
      </div>
    </div>
  );
}
