import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAnalyzeRoutes } from "./routes/analyze";
import { registerHealthRoutes } from "./routes/health";

const app = Fastify({
  logger: true,
});

async function start(): Promise<void> {
  await app.register(cors, {
    origin: [/^http:\/\/localhost:5173$/, /^chrome-extension:\/\//],
  });

  await registerAnalyzeRoutes(app);
  await registerHealthRoutes(app);

  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
