import { useEffect, useMemo, useState } from "react";

type AnalyzeResponse = {
  summary: string;
  topics: string[];
  transcript: string;
};

type AnalyzeError = {
  message: string;
};

const API_URL = "http://127.0.0.1:4000/analyze-reel";

type ReelUrlDetectedMessage = {
  type: "REEL_URL_DETECTED";
  url: string;
};

type RequestReelUrlMessage = {
  type: "REQUEST_REEL_URL";
};

type ReelUrlResponse = {
  url: string | null;
};

export default function App() {
  const [reelUrl, setReelUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const canSubmit = useMemo(() => reelUrl.trim().length > 0 && !loading, [reelUrl, loading]);

  useEffect(() => {
    if (!chrome?.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const [activeTab] = tabs;
      if (!activeTab?.id) return;

      const message: RequestReelUrlMessage = { type: "REQUEST_REEL_URL" };
      chrome.tabs.sendMessage(activeTab.id, message, (response: ReelUrlResponse | undefined) => {
        if (chrome.runtime.lastError) return;
        if (!response?.url) return;
        if (hasUserEdited || reelUrl.trim().length > 0) return;
        setReelUrl(response.url);
      });
    });

    const handleRuntimeMessage = (message: ReelUrlDetectedMessage) => {
      if (message?.type !== "REEL_URL_DETECTED") return;
      if (hasUserEdited || reelUrl.trim().length > 0) return;
      setReelUrl(message.url);
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    };
  }, [hasUserEdited, reelUrl]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reelUrl: reelUrl.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json()) as AnalyzeError;
        throw new Error(body.message || "Failed to analyze reel");
      }

      const payload = (await response.json()) as AnalyzeResponse;
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="title">Reel Analyzer</div>
        <div className="subtitle">Paste a Reel link and get a quick breakdown.</div>
      </header>

      <section className="card">
        <label className="label" htmlFor="reel-url">
          Instagram Reel URL
        </label>
        <input
          id="reel-url"
          className="input"
          placeholder="https://www.instagram.com/reel/..."
          value={reelUrl}
          onChange={(event) => {
            setHasUserEdited(true);
            setReelUrl(event.target.value);
          }}
        />
        <div style={{ height: 10 }} />
        <button className="button" disabled={!canSubmit} onClick={handleSubmit}>
          {loading ? "Analyzing..." : "Analyze Reel"}
        </button>
        {loading && <div className="status">Working on it. This can take a moment.</div>}
        {error && <div className="error">{error}</div>}
      </section>

      {data && (
        <section className="card">
          <div className="section-title">Summary</div>
          <div className="summary">{data.summary}</div>
          <div style={{ height: 12 }} />
          <div className="section-title">Topics</div>
          <div className="topics">
            {data.topics.map((topic) => (
              <span className="topic" key={topic}>
                {topic}
              </span>
            ))}
          </div>
          <div style={{ height: 12 }} />
          <div className="section-title">Transcript</div>
          <div className="transcript">{data.transcript}</div>
        </section>
      )}

      <footer className="footer">Powered by your local Fastify server.</footer>
    </div>
  );
}
