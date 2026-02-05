import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, rm } from "fs/promises";
import { extname, join } from "path";
import { extractAudio } from "../services/audio";
import { analyzeMedia, MediaNotAvailableError } from "../services/pipeline";
import type { AnalyzeReelResponse, ErrorResponse } from "../types";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);
const UPLOAD_DIR = "/tmp/instasave";

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Reply: AnalyzeReelResponse | ErrorResponse }>(
    "/analyze-upload",
    async (request, reply) => {
      const file = await request.file({ limits: { fileSize: MAX_FILE_SIZE_BYTES } });

      if (!file) {
        return reply.status(400).send({ message: "Missing video file" });
      }

      if (file.fieldname !== "video") {
        return reply.status(400).send({ message: "Field name must be 'video'" });
      }

      const extension = extname(file.filename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        return reply.status(400).send({ message: "Unsupported file type" });
      }

      await mkdir(UPLOAD_DIR, { recursive: true });
      const baseName = `${randomUUID()}${extension}`;
      const videoPath = join(UPLOAD_DIR, baseName);

      const writeStream = createWriteStream(videoPath);
      await new Promise<void>((resolve, reject) => {
        file.file.pipe(writeStream);
        file.file.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", () => resolve());
      });

      let audioPath: string | null = null;

      try {
        audioPath = await extractAudio(videoPath);
        const result = await analyzeMedia({ audioPath });

        return reply.send({
          summary: result.summary,
          topics: result.topics,
          transcript: result.transcript,
        });
      } catch (err) {
        request.log.error(err);
        if (err instanceof MediaNotAvailableError) {
          return reply.status(400).send({ message: err.message });
        }
        return reply.status(500).send({
          message: err instanceof Error ? err.message : "Failed to process upload",
        });
      } finally {
        await rm(videoPath, { force: true });
        if (audioPath) {
          await rm(audioPath, { force: true });
        }
      }
    }
  );
}
