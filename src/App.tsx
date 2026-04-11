import { useState, useCallback } from "react";
import NavBar from "./components/NavBar";
import HomeScreen from "./components/HomeScreen";
import ResultsScreen from "./components/ResultsScreen";
import HistoryScreen from "./components/HistoryScreen";
import CompareScreen from "./components/CompareScreen";
import {
  Screen, ScrapeResult,
  ScrapeScreenState, CompareScreenState, HistoryScreenState,
} from "./types";

const INITIAL_SCRAPE_STATE: ScrapeScreenState = {
  url: "",
  intent: "",
  result: null,
  currentResult: null,
  breadcrumb: null,
  activeSection: null,
  saved: false,
};

const INITIAL_COMPARE_STATE: CompareScreenState = {
  url1: "",
  url2: "",
  intent: "",
  result: null,
  originalResult: null,
  rawResult: "",
  designResult: null,
  content1: "",
  content2: "",
  originalContent1: "",
  originalContent2: "",
  links1: [],
  links2: [],
  activeChip1: null,
  activeChip2: null,
  compareBreadcrumb: null,
  saved: false,
};

const INITIAL_HISTORY_STATE: HistoryScreenState = {
  rows: [],
  loaded: false,
  expandedId: null,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [scrapeState, setScrapeState] = useState<ScrapeScreenState>(INITIAL_SCRAPE_STATE);
  const [compareState, setCompareState] = useState<CompareScreenState>(INITIAL_COMPARE_STATE);
  const [historyState, setHistoryState] = useState<HistoryScreenState>(INITIAL_HISTORY_STATE);

  const handleResults = useCallback((result: Omit<ScrapeResult, "id" | "created_at">) => {
    setScrapeState((prev) => ({
      ...prev,
      result,
      currentResult: result,
      breadcrumb: null,
      activeSection: null,
      saved: false,
    }));
    setScreen("results");
  }, []);

  const handleScrapeAnother = useCallback(() => {
    setScrapeState(INITIAL_SCRAPE_STATE);
    setScreen("home");
  }, []);

  const handleNavigate = useCallback((target: Screen) => {
    if (target === "home" && !scrapeState.result) {
      setScrapeState(INITIAL_SCRAPE_STATE);
    }
    setScreen(target);
  }, [scrapeState.result]);

  const handleHistoryAdded = useCallback(() => {
    setHistoryState((prev) => ({ ...prev, loaded: false }));
  }, []);

  const activeNavScreen: Screen = screen === "results" ? "home" : screen;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <NavBar active={activeNavScreen} onNavigate={handleNavigate} />

      <div style={{ display: screen === "home" ? "block" : "none" }}>
        <HomeScreen onResults={handleResults} />
      </div>

      <div style={{ display: screen === "results" ? "block" : "none" }}>
        {scrapeState.result && (
          <ResultsScreen
            scrapeState={scrapeState}
            setScrapeState={setScrapeState}
            onScrapeAnother={handleScrapeAnother}
            onHistoryAdded={handleHistoryAdded}
          />
        )}
      </div>

      <div style={{ display: screen === "history" ? "block" : "none" }}>
        <HistoryScreen
          historyState={historyState}
          setHistoryState={setHistoryState}
        />
      </div>

      <div style={{ display: screen === "compare" ? "block" : "none" }}>
        <CompareScreen
          compareState={compareState}
          setCompareState={setCompareState}
        />
      </div>
    </div>
  );
}
