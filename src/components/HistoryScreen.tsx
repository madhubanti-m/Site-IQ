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
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={18} className="text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Scrape History</h2>
          {!loading && (
            <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {rows.length} saved
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-indigo-400" />
            </div>
            <p className="text-gray-500 font-medium">No scrapes saved yet</p>
            <p className="text-sm text-gray-400 mt-1">Go scrape a page and save the results.</p>
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
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); toggle(row.id); }}
                    className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {row.title || row.url}
                      </p>
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-0.5 transition-colors truncate max-w-full"
                      >
                        <ExternalLink size={10} />
                        <span className="truncate">{row.url}</span>
                      </a>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full truncate max-w-xs">
                          {row.intent}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(row.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-indigo-50/30">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Sparkles size={13} className="text-indigo-600" />
                        <span className="text-xs font-semibold text-indigo-700">AI Summary</span>
                      </div>
                      <ul className="space-y-2.5">
                        {bullets.length > 0 ? bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="mt-0.5 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-xs text-gray-700 leading-relaxed">{b}</span>
                          </li>
                        )) : (
                          <li className="text-xs text-gray-400 italic">No summary available.</li>
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
