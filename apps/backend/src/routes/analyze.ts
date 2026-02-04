import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { analyzeTranscript } from "../services/analysis";
import { transcribeReel } from "../services/transcription";
import type { AnalyzeReelResponse, ErrorResponse } from "../types";

const analyzeReelSchema = z.object({
  reelUrl: z.string().url(),
});

type AnalyzeReelBody = z.infer<typeof analyzeReelSchema>;

export async function registerAnalyzeRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: AnalyzeReelBody; Reply: AnalyzeReelResponse | ErrorResponse }>(
    "/analyze-reel",
    async (request, reply) => {
      const parseResult = analyzeReelSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          message: "Invalid request body",
          issues: parseResult.error.issues,
        });
      }

      const { reelUrl } = parseResult.data;
      const transcript = await transcribeReel(reelUrl);
      const analysis = await analyzeTranscript(transcript);

      const response: AnalyzeReelResponse = {
        summary: analysis.summary,
        topics: analysis.topics,
        transcript,
      };

      return reply.send(response);
    }
  );
}
