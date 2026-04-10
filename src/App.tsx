import { useState } from "react";
import NavBar from "./components/NavBar";
import HomeScreen from "./components/HomeScreen";
import ResultsScreen from "./components/ResultsScreen";
import HistoryScreen from "./components/HistoryScreen";
import { Screen, ScrapeResult } from "./types";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentResult, setCurrentResult] = useState<Omit<ScrapeResult, "id" | "created_at"> | null>(null);

  function handleResults(result: Omit<ScrapeResult, "id" | "created_at">) {
    setCurrentResult(result);
    setScreen("results");
  }

  function handleScrapeAnother() {
    setCurrentResult(null);
    setScreen("home");
  }

  function handleSaved() {
    setScreen("history");
  }

  function handleNavigate(target: Screen) {
    if (target === "home") {
      setCurrentResult(null);
    }
    setScreen(target);
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <NavBar active={screen === "results" ? "home" : screen} onNavigate={handleNavigate} />
      {screen === "home" && (
        <HomeScreen onResults={handleResults} />
      )}
      {screen === "results" && currentResult && (
        <ResultsScreen
          result={currentResult}
          onScrapeAnother={handleScrapeAnother}
          onSaved={handleSaved}
        />
      )}
      {screen === "history" && (
        <HistoryScreen />
      )}
    </div>
  );
}
