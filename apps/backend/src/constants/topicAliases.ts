import { CANONICAL_TOPICS } from "./topics";

export const TOPIC_ALIASES: Record<string, string> = {
  chatgpt: "AI tools",
  "gpt tools": "AI tools",
  "artificial intelligence": "AI tools",
  "ai": "AI tools",
  "note taking": "Productivity",
  "productivity tools": "Productivity",
  "time management": "Productivity",
  "pricing strategy": "Pricing",
  "business pricing": "Pricing",
  "content marketing": "Marketing",
  "social media": "Marketing",
  "creator economy": "Content creation",
  "video editing": "Content creation",
  "side hustles": "Entrepreneurship",
  "startup growth": "Startups",
  "career advice": "Career growth",
};

const canonicalMap = new Map(
  CANONICAL_TOPICS.map((topic) => [topic.toLowerCase(), topic])
);

export const normalizeTopic = (topic: string): string => {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) return "";
  const alias = TOPIC_ALIASES[normalized];
  if (alias) return alias;
  const canonical = canonicalMap.get(normalized);
  if (canonical) return canonical;
  return topic.trim();
};
