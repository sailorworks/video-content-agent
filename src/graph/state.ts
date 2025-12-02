// src/graph/state.ts

export interface VideoReference {
  title: string;
  url: string;
  transcriptSnippet?: string; // What Apify extracts
  viewCount?: string;
}

export interface TrendArticle {
  title: string;
  url: string;
  summary: string; // What Exa finds
}

export interface AgentState {
  topic: string;
  researchData?: {
    videos: VideoReference[];
    trends: TrendArticle[];
    rawOutput: string; // Full LLM synthesis
  };
  // Future fields for next steps
  script?: string;
}
