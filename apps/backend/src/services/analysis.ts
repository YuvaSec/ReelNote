export type TranscriptAnalysis = {
  summary: string;
  topics: string[];
};

export async function analyzeTranscript(transcript: string): Promise<TranscriptAnalysis> {
  void transcript;
  return {
    summary: "This reel explains productivity tips for daily focus.",
    topics: ["productivity", "habits"],
  };
}
