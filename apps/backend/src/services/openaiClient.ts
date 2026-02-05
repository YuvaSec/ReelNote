import OpenAI from "openai";
import { config } from "../config";

const apiKey = config.openaiApiKey;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

export const openai = new OpenAI({ apiKey });
