export type AnalyzeReelRequest = {
  reelUrl: string;
  devAudioPath?: string;
};

export type AnalyzeReelResponse = {
  summary: string;
  topics: string[];
  transcript: string;
};

export type ErrorResponse = {
  message: string;
  issues?: Array<{
    path: Array<string | number>;
    message: string;
  }>;
};
