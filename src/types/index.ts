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
