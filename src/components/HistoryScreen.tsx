import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ScrapeResult, HistoryScreenState } from "../types";
import { Clock, ChevronDown, ChevronUp, ExternalLink, Sparkles, Search } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseBullets(summary: string): string[] {
  return summary
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

interface HistoryScreenProps {
  historyState: HistoryScreenState;
  setHistoryState: React.Dispatch<React.SetStateAction<HistoryScreenState>>;
}

export default function HistoryScreen({ historyState, setHistoryState }: HistoryScreenProps) {
  const { rows, loaded, expandedId } = historyState;

  useEffect(() => {
    if (loaded) return;
    async function load() {
      const { data } = await supabase
        .from("scrape_results")
        .select("*")
        .order("created_at", { ascending: false });
      setHistoryState((prev) => ({
        ...prev,
        rows: (data as ScrapeResult[]) ?? [],
        loaded: true,
      }));
    }
    load();
  }, [loaded, setHistoryState]);

  function toggle(id: string) {
    setHistoryState((prev) => ({
      ...prev,
      expandedId: prev.expandedId === id ? null : id,
    }));
  }

  const loading = !loaded;

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: "var(--bg-base)" }} className="py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={18} style={{ color: "var(--accent-violet-light)" }} />
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Scrape History</h2>
          {!loading && (
            <span
              className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(139,92,246,0.15)",
                color: "var(--accent-violet-light)",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              {rows.length} saved
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-5 animate-pulse"
                style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
              >
                <div className="h-4 rounded w-3/4 mb-2" style={{ background: "var(--bg-card)" }} />
                <div className="h-3 rounded w-1/2" style={{ background: "var(--bg-card)" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              <Search size={24} style={{ color: "var(--accent-violet-light)" }} />
            </div>
            <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No scrapes saved yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Go scrape a page and save the results.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row) => {
              const isOpen = expandedId === row.id;
              const bullets = parseBullets(row.summary);
              return (
                <div
                  key={row.id}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); toggle(row.id); }}
                    className="w-full flex items-start gap-4 p-5 text-left transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {row.title || row.url}
                      </p>
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs mt-0.5 transition-colors truncate max-w-full"
                        style={{ color: "var(--accent-violet-light)" }}
                      >
                        <ExternalLink size={10} />
                        <span className="truncate">{row.url}</span>
                      </a>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full truncate max-w-xs"
                          style={{
                            color: "var(--accent-violet-light)",
                            background: "rgba(139,92,246,0.12)",
                            border: "1px solid rgba(139,92,246,0.25)",
                          }}
                        >
                          {row.intent}
                        </span>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                          {timeAgo(row.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {isOpen
                        ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
                        : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                      }
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      className="px-5 py-4"
                      style={{
                        borderTop: "1px solid var(--border)",
                        background: "rgba(139,92,246,0.05)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-3">
                        <Sparkles size={13} style={{ color: "var(--accent-violet-light)" }} />
                        <span className="text-xs font-semibold" style={{ color: "var(--accent-violet-light)" }}>
                          AI Summary
                        </span>
                      </div>
                      <ul className="space-y-2.5">
                        {bullets.length > 0 ? bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span
                              className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                              style={{ background: "var(--accent-violet)" }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{b}</span>
                          </li>
                        )) : (
                          <li className="text-xs italic" style={{ color: "var(--text-muted)" }}>No summary available.</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
