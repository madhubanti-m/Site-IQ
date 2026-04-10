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

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active === item.id
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
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
