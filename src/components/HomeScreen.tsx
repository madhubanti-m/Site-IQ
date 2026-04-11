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

      onResults({ url: url.trim(), intent: intent.trim(), title, content, links, summary, analysis });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-16"
      style={{
        minHeight: "calc(100vh - 56px)",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.18) 0%, transparent 60%), var(--bg-base)",
      }}
    >
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <img
              src="/ScrapeIQ-1.1.png"
              alt="ScrapeIQ"
              style={{ height: "110px", width: "auto", objectFit: "contain" }}
            />
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-lg">
            Scrape smarter. Research faster.
          </p>
        </div>

        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            boxShadow: "0 0 40px rgba(139,92,246,0.1), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="space-y-1.5">
            <label
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Globe size={14} style={{ color: "var(--accent-violet-light)" }} />
              Website URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any website URL"
              disabled={loading}
              className="input-dark w-full px-4 py-3 rounded-xl text-sm disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Target size={14} style={{ color: "var(--accent-violet-light)" }} />
              Research Intent
            </label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="What are you looking for? e.g. pricing strategy, key features"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScrape(); } }}
              className="input-dark w-full px-4 py-3 rounded-xl text-sm disabled:opacity-50"
            />
          </div>

          {error && (
            <p
              className="text-sm px-4 py-2.5 rounded-lg"
              style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleScrape(); }}
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Powered by Firecrawl + Claude AI
        </p>
      </div>
    </div>
  );
}
