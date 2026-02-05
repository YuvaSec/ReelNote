import { analyzeTranscript } from "./analysis";
import { transcribeAudio } from "./transcription";

export type AnalyzeMediaInput = {
  audioPath?: string;
};

export type AnalyzeMediaResult = {
  title: string;
  transcript: string;
  summary: string;
  topics: string[];
};

export class MediaNotAvailableError extends Error {
  constructor(message = "Audio path is required for analysis") {
    super(message);
    this.name = "MediaNotAvailableError";
  }
}

export async function analyzeMedia(input: AnalyzeMediaInput): Promise<AnalyzeMediaResult> {
  if (!input.audioPath) {
    throw new MediaNotAvailableError();
  }

  const transcript = await transcribeAudio(input.audioPath);
  const analysis = await analyzeTranscript(transcript);

  return {
    title: analysis.title,
    transcript,
    summary: analysis.summary,
    topics: analysis.topics,
  };
}
