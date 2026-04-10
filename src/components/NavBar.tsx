import { Flame, Clock, Search, GitCompare } from "lucide-react";
import { Screen } from "../types";

interface NavBarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function NavBar({ active, onNavigate }: NavBarProps) {
  const navItems: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Scrape", icon: <Search size={16} /> },
    { id: "compare", label: "Compare", icon: <GitCompare size={16} /> },
    { id: "history", label: "History", icon: <Clock size={16} /> },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 group"
        >
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Flame size={15} className="text-white" />
          </div>
          <span className="text-gray-900 font-semibold text-base tracking-tight">ScrapeIQ</span>
        </button>

        <div className="flex items-center" style={{ gap: "8px" }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                height: "36px",
                borderRadius: "20px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: active === item.id ? 700 : 400,
                border: active === item.id ? "none" : "1px solid #E0E7FF",
                background: active === item.id ? "#6366f1" : "white",
                color: active === item.id ? "white" : "#6366f1",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (active !== item.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#EEF2FF";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1";
                }
              }}
              onMouseLeave={(e) => {
                if (active !== item.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#E0E7FF";
                }
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
