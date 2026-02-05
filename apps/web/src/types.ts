export type ReelAnalysis = {
  id: string;
  reelUrl: string;
  title?: string | null;
  collection: string;
  summary: string;
  topics: string[];
  transcript: string;
  createdAt: string;
};
