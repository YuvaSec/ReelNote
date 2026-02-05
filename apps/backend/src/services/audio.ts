import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { join } from "path";

const AUDIO_DIR = "/tmp/instasave";

export async function extractAudio(videoPath: string): Promise<string> {
  await mkdir(AUDIO_DIR, { recursive: true });
  const outputPath = join(AUDIO_DIR, `${randomUUID()}.wav`);

  return new Promise<string>((resolve, reject) => {
    const process = spawn("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      outputPath,
    ]);

    let stderr = "";

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", (error) => {
      reject(new Error(`FFmpeg failed to start: ${error.message}`));
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
        return;
      }

      reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim()}`));
    });
  });
}
