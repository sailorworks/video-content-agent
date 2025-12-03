export interface VideoReference {
  title: string;
  url: string;
  videoId: string; // Added for Apify Actor
  viewCount?: string;
}

export interface ResearchData {
  videos: VideoReference[];
  rawTranscripts: string; // The "Secret Sauce" from Apify
  trends: string; // The "Fresh News" from Exa
}

export interface AgentState {
  topic: string;
  researchData?: ResearchData;
  script?: string;
}
