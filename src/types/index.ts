export interface ScrapeResult {
  id: string;
  url: string;
  intent: string;
  title: string;
  content: string;
  links: string[];
  summary: string;
  analysis: string;
  created_at: string;
}

export type Screen = "home" | "results" | "history" | "compare";

export interface ScrapeScreenState {
  url: string;
  intent: string;
  result: Omit<ScrapeResult, "id" | "created_at"> | null;
  currentResult: Omit<ScrapeResult, "id" | "created_at"> | null;
  breadcrumb: { domain: string; section: string } | null;
  activeSection: string | null;
  saved: boolean;
}

export interface CompareRow {
  dimension: string;
  site1: string;
  site2: string;
}

export interface CompareResult {
  rows: CompareRow[];
  keyInsight: string;
  winner: string;
  winnerWhy: string;
  domain1: string;
  domain2: string;
}

export interface DesignSite {
  domain: string;
  screenshot: string | null;
  analysis: string;
  score: number;
}

export interface DesignResult {
  site1: DesignSite;
  site2: DesignSite;
  designWinner: string;
  winnerReason: string;
}

export interface CompareScreenState {
  url1: string;
  url2: string;
  intent: string;
  result: CompareResult | null;
  originalResult: CompareResult | null;
  rawResult: string;
  designResult: DesignResult | null;
  content1: string;
  content2: string;
  originalContent1: string;
  originalContent2: string;
  links1: string[];
  links2: string[];
  activeChip1: string | null;
  activeChip2: string | null;
  compareBreadcrumb: string | null;
  saved: boolean;
}

export interface HistoryScreenState {
  rows: ScrapeResult[];
  loaded: boolean;
  expandedId: string | null;
}
