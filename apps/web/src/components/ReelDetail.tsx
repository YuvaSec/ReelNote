import { useState } from "react";
import type { ReelAnalysis } from "../types";

type ReelDetailProps = {
  reel: ReelAnalysis | null;
  loading: boolean;
  error: string | null;
  onDelete: () => void;
  deleteDisabled: boolean;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const generateMarkdown = (reel: ReelAnalysis) => `# Instagram Reel Analysis

**Title:** ${reel.title?.trim() || reel.summary.split(/\s+/).slice(0, 6).join(" ")}
**Source URL:** ${reel.reelUrl}
**Collection:** ${reel.collection}
**Created:** ${formatDate(reel.createdAt)}

## Summary
${reel.summary}

## Topics
${reel.topics.map((topic) => `- ${topic}`).join("\n")}

## Transcript
${reel.transcript}
`;

export default function ReelDetail({
  reel,
  loading,
  error,
  onDelete,
  deleteDisabled,
}: ReelDetailProps) {
  const [copied, setCopied] = useState(false);

  const getFallbackTitle = (summary: string) =>
    summary
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");

  if (loading) {
    return <div className="detail-status">Loading reel...</div>;
  }

  if (error) {
    return <div className="detail-error">{error}</div>;
  }

  if (!reel) {
    return <div className="detail-status">Select a reel to view details</div>;
  }

  const title = reel.title?.trim() || getFallbackTitle(reel.summary);

  const handleDownload = () => {
    const markdown = generateMarkdown(reel);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reel-${reel.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown(reel));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="detail-card">
      <div className="detail-header">
        <div className="detail-title-main">{title}</div>
        <a className="detail-link" href={reel.reelUrl} target="_blank" rel="noreferrer">
          {reel.reelUrl}
        </a>
        <div className="detail-collection">Collection: {reel.collection}</div>
        <div className="detail-actions">
          <button className="detail-button" onClick={handleDownload} type="button">
            Export as Markdown
          </button>
          <button className="detail-button ghost" onClick={handleCopy} type="button">
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            className="detail-button danger"
            onClick={onDelete}
            type="button"
            disabled={deleteDisabled}
          >
            Delete
          </button>
        </div>
      </div>

      <section className="detail-section">
        <div className="detail-title">Summary</div>
        <div className="detail-text">{reel.summary}</div>
      </section>

      <section className="detail-section">
        <div className="detail-title">Topics</div>
        <div className="detail-tags">
          {reel.topics.map((topic) => (
            <span key={topic} className="detail-tag">
              {topic}
            </span>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <div className="detail-title">Transcript</div>
        <div className="detail-transcript">{reel.transcript}</div>
      </section>
    </div>
  );
}
