import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdir, readdir, stat } from "fs/promises";
import { join } from "path";
import { config } from "../config";

const DOWNLOAD_DIR = "/tmp/instasave";
const COOKIE_FILE = config.instagramCookiesPath;
const COOKIES_BROWSER = config.instagramCookiesBrowser;
const CLEAR_COOKIES_AFTER_USE = config.instagramCookiesClear;

export class MediaDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaDownloadError";
  }
}

export class DependencyMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DependencyMissingError";
  }
}

const findLatestDownload = async (prefix: string) => {
  const files = await readdir(DOWNLOAD_DIR);
  const candidates = files.filter((file) => file.startsWith(prefix));
  if (candidates.length === 0) return null;

  let latest: { name: string; mtimeMs: number } | null = null;

  for (const name of candidates) {
    const fileStat = await stat(join(DOWNLOAD_DIR, name));
    if (!latest || fileStat.mtimeMs > latest.mtimeMs) {
      latest = { name, mtimeMs: fileStat.mtimeMs };
    }
  }

  return latest ? join(DOWNLOAD_DIR, latest.name) : null;
};

export async function downloadReelMedia(reelUrl: string): Promise<string> {
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  const baseName = randomUUID();
  const outputTemplate = join(DOWNLOAD_DIR, `${baseName}.%(ext)s`);

  const args = [
    "--no-playlist",
    "-f",
    "bestaudio/best",
    "-o",
    outputTemplate,
  ];

  if (COOKIE_FILE) {
    args.push("--cookies", COOKIE_FILE);
  } else if (COOKIES_BROWSER) {
    args.push("--cookies-from-browser", COOKIES_BROWSER);
  }

  args.push(reelUrl);

  await new Promise<void>((resolve, reject) => {
    const process = spawn("yt-dlp", args);

    let stderr = "";

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new DependencyMissingError("yt-dlp is not installed or not on PATH"));
        return;
      }
      reject(new MediaDownloadError(`Failed to start yt-dlp: ${error.message}`));
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new MediaDownloadError(`yt-dlp exited with code ${code}: ${stderr.trim()}`));
    });
  });

  const downloaded = await findLatestDownload(`${baseName}.`);
  if (!downloaded) {
    throw new MediaDownloadError("Downloaded media file not found");
  }

  if (COOKIE_FILE && CLEAR_COOKIES_AFTER_USE) {
    import("fs/promises")
      .then(({ rm }) => rm(COOKIE_FILE, { force: true }))
      .catch(() => undefined);
  }

  return downloaded;
}
