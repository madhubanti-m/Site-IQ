import { Clock, Search, GitCompare } from "lucide-react";
import { Screen } from "../types";

interface NavBarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function NavBar({ active, onNavigate }: NavBarProps) {
  const navItems: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Scrape", icon: <Search size={15} /> },
    { id: "compare", label: "Compare", icon: <GitCompare size={15} /> },
    { id: "history", label: "History", icon: <Clock size={15} /> },
  ];

  return (
    <nav
      style={{
        background: "rgba(11, 15, 30, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onNavigate("home"); }}
          className="flex items-center"
        >
          <img
            src="/ScrapeIQ-2.png"
            alt="ScrapeIQ"
            style={{ height: "34px", width: "auto", objectFit: "contain" }}
          />
        </button>

        <div className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => { e.preventDefault(); onNavigate(item.id); }}
                style={{
                  height: "34px",
                  borderRadius: "20px",
                  padding: "0 14px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? "none" : "1px solid var(--border)",
                  background: isActive
                    ? "linear-gradient(135deg, #7c3aed, #8b5cf6)"
                    : "transparent",
                  color: isActive ? "white" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 0 16px rgba(139,92,246,0.35)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.1)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-violet-light)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-violet-light)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  }
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
