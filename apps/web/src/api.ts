import type { ReelAnalysis } from "./types";

const API_BASE_URL = "http://127.0.0.1:4000";

export async function fetchReels(): Promise<ReelAnalysis[]> {
  const response = await fetch(`${API_BASE_URL}/reels`);
  if (!response.ok) {
    throw new Error("Failed to fetch reels");
  }
  return (await response.json()) as ReelAnalysis[];
}

export async function fetchReelById(id: string): Promise<ReelAnalysis> {
  const response = await fetch(`${API_BASE_URL}/reels/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch reel detail");
  }
  return (await response.json()) as ReelAnalysis;
}

export async function deleteReelById(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reels/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete reel");
  }
}
