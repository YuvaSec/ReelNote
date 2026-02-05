import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { rm } from "fs/promises";
import { extractAudio } from "../services/audio";
import {
  DependencyMissingError,
  MediaDownloadError,
  downloadReelMedia,
} from "../services/download";
import { analyzeMedia } from "../services/pipeline";
import { findReelByUrl, insertReel } from "../db";
import type { AnalyzeReelResponse, ErrorResponse } from "../types";
import { randomUUID } from "crypto";

const analyzeReelSchema = z.object({
  reelUrl: z.string().url(),
  devAudioPath: z.string().min(1).optional(),
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

      const { devAudioPath, reelUrl } = parseResult.data;

      if (devAudioPath) {
        try {
          const result = await analyzeMedia({ audioPath: devAudioPath });
          return reply.send(result);
        } catch (err) {
          request.log.error(err);
          return reply.status(500).send({
            message: err instanceof Error ? err.message : "Failed to analyze media",
          });
        }
      }

      let mediaPath: string | null = null;
      let audioPath: string | null = null;

      try {
        const existing = findReelByUrl.get(reelUrl);
        if (existing) {
          return reply.send({
            summary: existing.summary,
            topics: JSON.parse(existing.topics) as string[],
            transcript: existing.transcript,
          });
        }

        mediaPath = await downloadReelMedia(reelUrl);
        audioPath = await extractAudio(mediaPath);
        const result = await analyzeMedia({ audioPath });

        const createdAt = new Date().toISOString();
        const record = {
          id: randomUUID(),
          reel_url: reelUrl,
          title: result.title,
          collection: "Uncategorized",
          transcript: result.transcript,
          summary: result.summary,
          topics: JSON.stringify(result.topics),
          created_at: createdAt,
        };

        insertReel.run(record);

        return reply.send({
          summary: result.summary,
          topics: result.topics,
          transcript: result.transcript,
        });
      } catch (err) {
        request.log.error(err);

        if (err instanceof DependencyMissingError || err instanceof MediaDownloadError) {
          return reply.status(500).send({ message: err.message });
        }

        return reply.status(500).send({
          message: err instanceof Error ? err.message : "Failed to analyze reel URL",
        });
      } finally {
        if (mediaPath) {
          await rm(mediaPath, { force: true });
        }
        if (audioPath) {
          await rm(audioPath, { force: true });
        }
      }
    }
  );
}
