export interface VideoReference {
  title: string;
  url: string;
  videoId: string;
  viewCount?: string;
}

export interface TwitterInsight {
  text: string;
  url: string;
  likes: number;
  comments: number;
  views: number;
}

export interface ResearchData {
  videos: VideoReference[];
  rawTranscripts: string;
  trends: string;
  twitterInsights?: TwitterInsight[];
}

export interface AgentState {
  topic: string;
  researchData?: ResearchData | undefined;
  script?: string | undefined;
  // NEW: Store feedback for regeneration
  // FIX: Added "| undefined" here.
  // This allows you to do: state.feedback = undefined
  feedback?: string | undefined;
  audioUrl?: string | undefined; // <--- Add this
}
