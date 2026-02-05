import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { deleteReelById, findReelById, findReelByUrl, listReels } from "../db";
import type { ErrorResponse } from "../types";

const querySchema = z.object({
  reelUrl: z.string().url().optional(),
});

export async function registerReelReadRoutes(app: FastifyInstance): Promise<void> {
  app.get("/reels", async (request, reply) => {
    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        message: "Invalid query",
        issues: parseResult.error.issues,
      } satisfies ErrorResponse);
    }

    const { reelUrl } = parseResult.data;
    if (reelUrl) {
      const row = findReelByUrl.get(reelUrl);
      if (!row) {
        return reply.send([]);
      }

      return reply.send([
        {
          id: row.id,
          reelUrl: row.reel_url,
          title: row.title,
          collection: row.collection,
          summary: row.summary,
          createdAt: row.created_at,
        },
      ]);
    }

    const rows = listReels.all() as Array<{
      id: string;
      reel_url: string;
      title: string | null;
      collection: string;
      summary: string;
      topics: string;
      created_at: string;
    }>;

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        reelUrl: row.reel_url,
        title: row.title,
        collection: row.collection,
        summary: row.summary,
        topics: JSON.parse(row.topics) as string[],
        createdAt: row.created_at,
      }))
    );
  });

  app.get<{ Params: { id: string } }>("/reels/:id", async (request, reply) => {
    const { id } = request.params;
    const row = findReelById.get(id);

    if (!row) {
      return reply.status(404).send({ message: "Reel not found" } satisfies ErrorResponse);
    }

    return reply.send({
      id: row.id,
      reelUrl: row.reel_url,
      title: row.title,
      collection: row.collection,
      transcript: row.transcript,
      summary: row.summary,
      topics: JSON.parse(row.topics) as string[],
      createdAt: row.created_at,
    });
  });

  app.delete<{ Params: { id: string } }>("/reels/:id", async (request, reply) => {
    const { id } = request.params;
    const row = findReelById.get(id);

    if (!row) {
      return reply.status(404).send({ message: "Reel not found" } satisfies ErrorResponse);
    }

    deleteReelById.run(id);
    return reply.send({ success: true });
  });
}
