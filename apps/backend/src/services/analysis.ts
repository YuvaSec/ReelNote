import { openai } from "./openaiClient";
import { CANONICAL_TOPICS } from "../constants/topics";
import { normalizeTopic } from "../constants/topicAliases";

export type TranscriptAnalysis = {
  title: string;
  summary: string;
  topics: string[];
};

const ANALYSIS_SYSTEM_PROMPT = [
  "You are an expert analyst for short-form video transcripts.",
  "Write a crisp 2-3 sentence summary in plain language.",
  "Generate a short, descriptive English title (maximum 8 words), no ending punctuation.",
  "You are classifying content into EXISTING topics.",
  "Here is the list of existing topics:",
  CANONICAL_TOPICS.map((topic) => `- ${topic}`).join("\n"),
  "Rules:",
  "Choose up to 3 topics from the list above if relevant.",
  "ONLY create a new topic if none of the existing topics apply.",
  "New topics must be broad, reusable, max 3 words, English only.",
  "Do NOT create near-duplicates.",
  "Ignore filler words, self-intros, and call-to-action clutter.",
  "If the transcript is too short or unclear, be honest but still provide best-effort topics.",
  "All output must be in English only. Do not include non-English scripts.",
].join(" ");

const normalizeTranscript = (transcript: string) =>
  transcript.replace(/\s+/g, " ").trim();

const normalizeAndClampTopics = (topics: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const topic of topics) {
    const cleaned = topic
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^[\u2022\\-\\*]+\\s*/, "")
      .replace(/[.]+$/g, "");
    if (!cleaned) continue;
    const normalized = normalizeTopic(cleaned);
    const key = normalized.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (output.length >= 3) break;
  }

  return output;
};

export async function analyzeTranscript(transcript: string): Promise<TranscriptAnalysis> {
  const normalized = normalizeTranscript(transcript).slice(0, 8000);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Transcript:\n${normalized}\n\nReturn JSON with keys: title (max 8 words), summary (2-3 sentences), and topics (max 3 items).`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "TranscriptAnalysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            topics: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 3,
            },
          },
          required: ["title", "summary", "topics"],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty analysis response");
  }

  const parsed = JSON.parse(content) as TranscriptAnalysis;
  return {
    title: parsed.title.trim().replace(/[.?!]+$/g, ""),
    summary: parsed.summary.trim(),
    topics: normalizeAndClampTopics(parsed.topics),
  };
}
