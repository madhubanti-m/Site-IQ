import { Loader2 } from "lucide-react";

export interface Section {
  name: string;
  url: string;
}

interface ExploreSectionsProps {
  sections: Section[];
  loadingSection: string | null;
  onSectionClick: (section: Section) => void;
}

export default function ExploreSections({ sections, loadingSection, onSectionClick }: ExploreSectionsProps) {
  if (sections.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Explore sections of this site</p>
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const isLoading = loadingSection === section.url;
          return (
            <button
              key={section.url}
              type="button"
              onClick={() => onSectionClick(section)}
              disabled={loadingSection !== null}
              style={{
                height: "32px",
                borderRadius: "20px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 500,
                border: "1px solid #6366f1",
                background: "white",
                color: "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: loadingSection !== null ? "not-allowed" : "pointer",
                opacity: loadingSection !== null && !isLoading ? 0.5 : 1,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loadingSection) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#EEF2FF";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "white";
              }}
            >
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              {section.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
