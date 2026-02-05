import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { registerAnalyzeRoutes } from "./routes/analyze";
import { registerHealthRoutes } from "./routes/health";
import { registerUploadRoutes } from "./routes/upload";
import { registerReelReadRoutes } from "./routes/reels";

const app = Fastify({
  logger: true,
});

async function start(): Promise<void> {
  await app.register(cors, {
    origin: [
      /^http:\/\/localhost:5173$/,
      /^http:\/\/localhost:5174$/,
      /^http:\/\/127\.0\.0\.1:5173$/,
      /^http:\/\/127\.0\.0\.1:5174$/,
      /^chrome-extension:\/\//,
    ],
  });
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  await registerAnalyzeRoutes(app);
  await registerHealthRoutes(app);
  await registerUploadRoutes(app);
  await registerReelReadRoutes(app);

  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
