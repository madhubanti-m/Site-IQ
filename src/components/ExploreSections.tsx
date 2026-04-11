import { Loader2, ChevronLeft } from "lucide-react";

export interface Section {
  name: string;
  url: string;
}

interface ExploreSectionsProps {
  sections: Section[];
  loadingSection: string | null;
  activeSection: string | null;
  onSectionClick: (section: Section) => void;
  breadcrumb?: { domain: string; section: string } | null;
  onBack?: () => void;
}

export function extractSections(links: string[], baseUrl: string, max = 8): Section[] {
  let domain = "";
  try {
    domain = new URL(baseUrl).hostname;
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const result: Section[] = [];

  for (const link of links) {
    if (result.length >= max) break;
    try {
      const u = new URL(link);
      if (u.hostname !== domain) continue;

      const parts = u.pathname.replace(/^\/|\/$/g, "").split("/");
      if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) continue;
      if (parts.length > 2) continue;

      const last = parts[parts.length - 1];
      if (!last) continue;
      if (/\d{3,}/.test(last)) continue;
      if (/\.[a-z]{2,4}$/.test(last)) continue;
      if (last === "home" || last === "index") continue;

      const name = last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
      const key = u.pathname.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({ name, url: link });
    } catch {
      continue;
    }
  }

  return result;
}

export default function ExploreSections({
  sections,
  loadingSection,
  activeSection,
  onSectionClick,
  breadcrumb,
  onBack,
}: ExploreSectionsProps) {
  if (sections.length < 2) return null;

  return (
    <div className="space-y-2">
      {breadcrumb && onBack && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <span className="font-medium text-gray-700">
            Now showing: <span className="text-indigo-600">{breadcrumb.section}</span> section
          </span>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-medium transition-colors ml-2"
          >
            <ChevronLeft size={12} />
            Back to full page
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 font-medium">Explore sections of this site</p>

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
                height: "32px",
                borderRadius: "20px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 500,
                border: "1px solid #6366f1",
                background: isActive ? "#6366f1" : "white",
                color: isActive ? "white" : "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: loadingSection !== null ? "not-allowed" : "pointer",
                opacity: loadingSection !== null && !isLoading ? 0.5 : 1,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loadingSection && !isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#EEF2FF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
                }
              }}
            >
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              {section.name}
            </button>
          );
        })}
      </div>

      {loadingSection && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 mt-1">
          <Loader2 size={11} className="animate-spin" />
          Loading {sections.find((s) => s.url === loadingSection)?.name ?? "section"}...
        </div>
      )}
    </div>
  );
}
