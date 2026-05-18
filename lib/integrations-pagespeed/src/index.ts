export { analyzeWithPageSpeed, normalizeUrl, PageSpeedError } from "./pagespeed.js";

export interface PageSpeedCategoryScore {
  name: string;
  score: number;
  summary: string;
}

export interface PageSpeedAnalyzeResult {
  url: string;
  overallPercentage: number;
  categories: PageSpeedCategoryScore[];
  topFixes: string[];
}
