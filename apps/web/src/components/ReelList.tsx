import type { ReelAnalysis } from "../types";

type ReelListProps = {
  reels: ReelAnalysis[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function ReelList({ reels, selectedId, onSelect }: ReelListProps) {
  if (reels.length === 0) {
    return <div className="empty-state">No analyzed reels yet</div>;
  }

  const getFallbackTitle = (summary: string) =>
    summary
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");

  return (
    <div className="reel-list">
      {reels.map((reel) => (
        <button
          key={reel.id}
          className={`reel-item ${selectedId === reel.id ? "selected" : ""}`}
          onClick={() => onSelect(reel.id)}
          type="button"
        >
          <div className="reel-collection">{reel.collection}</div>
          <div className="reel-title">
            {reel.title?.trim() || getFallbackTitle(reel.summary)}
          </div>
          <div className="reel-summary">{reel.summary}</div>
        </button>
      ))}
    </div>
  );
}
