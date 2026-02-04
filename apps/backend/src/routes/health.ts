import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "../types";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Reply: HealthResponse }>(
    "/health",
    async () => ({ status: "ok" })
  );
}
