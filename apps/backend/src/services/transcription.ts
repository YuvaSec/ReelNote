import { createReadStream } from "fs";
import { openai } from "./openaiClient";

export async function transcribeReel(reelUrl: string): Promise<string> {
  void reelUrl;
  return "Today I want to share three habits that changed my productivity...";
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  const response = await openai.audio.translations.create({
    file: createReadStream(audioPath),
    model: "whisper-1",
  });

  return response.text;
}
