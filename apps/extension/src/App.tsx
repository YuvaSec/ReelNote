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
const REELS_QUERY_URL = "http://127.0.0.1:4000/reels";
const DASHBOARD_URL = "http://localhost:5174";

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

type SavedReelsDetectedMessage = {
  type: "SAVED_REELS_DETECTED";
  collection: string;
  reelUrls: string[];
};

type RequestSavedReelsMessage = {
  type: "REQUEST_SAVED_REELS";
};

type SavedReelsResponse = {
  collection: string | null;
  reelUrls: string[];
};

type ReelListItem = {
  id: string;
  reelUrl: string;
  collection: string;
  summary: string;
  createdAt: string;
  title?: string | null;
};

type AnalysisStatus = "idle" | "downloading" | "transcribing" | "summarizing" | "done" | "error";

export default function App() {
  const [reelUrl, setReelUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [savedCollection, setSavedCollection] = useState<string | null>(null);
  const [savedReels, setSavedReels] = useState<string[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analyzedMap, setAnalyzedMap] = useState<Record<string, boolean>>({});
  const [selectedSavedUrl, setSelectedSavedUrl] = useState<string | null>(null);
  const [savedPage, setSavedPage] = useState(1);
  const [lastCollection, setLastCollection] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");

  const canSubmit = useMemo(() => reelUrl.trim().length > 0 && !loading, [reelUrl, loading]);

  const mergeSavedReels = (current: string[], incoming: string[]) => {
    const seen = new Set(current);
    const merged = [...current];
    incoming.forEach((url) => {
      if (!seen.has(url)) {
        seen.add(url);
        merged.push(url);
      }
    });
    return merged;
  };

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

      const savedMessage: RequestSavedReelsMessage = { type: "REQUEST_SAVED_REELS" };
      chrome.tabs.sendMessage(
        activeTab.id,
        savedMessage,
        (response: SavedReelsResponse | undefined) => {
          if (chrome.runtime.lastError) return;
          if (!response?.collection) return;
          setSavedCollection(response.collection);
          setSavedReels((current) => mergeSavedReels(current, response.reelUrls));
        }
      );
    });

    const handleRuntimeMessage = (message: ReelUrlDetectedMessage) => {
      if (message?.type !== "REEL_URL_DETECTED") return;
      if (hasUserEdited || reelUrl.trim().length > 0) return;
      setReelUrl(message.url);
    };

    const handleSavedRuntimeMessage = (message: SavedReelsDetectedMessage) => {
      if (message?.type !== "SAVED_REELS_DETECTED") return;
      setSavedCollection(message.collection);
      setSavedReels((current) => mergeSavedReels(current, message.reelUrls));
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    chrome.runtime.onMessage.addListener(handleSavedRuntimeMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      chrome.runtime.onMessage.removeListener(handleSavedRuntimeMessage);
    };
  }, [hasUserEdited, reelUrl]);

  useEffect(() => {
    if (!savedCollection) return;
    if (lastCollection === null || lastCollection === savedCollection) return;
    setSavedReels([]);
    setAnalyzedMap({});
    setSelectedSavedUrl(null);
    setSavedPage(1);
  }, [savedCollection, lastCollection]);

  useEffect(() => {
    if (savedCollection) {
      setLastCollection(savedCollection);
    }
  }, [savedCollection]);

  useEffect(() => {
    const trimmed = reelUrl.trim();
    if (!trimmed) {
      setIsAnalyzed(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`${REELS_QUERY_URL}?reelUrl=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setIsAnalyzed(false);
          return;
        }
        const items = (await response.json()) as ReelListItem[];
        setIsAnalyzed(items.length > 0);
      } catch {
        setIsAnalyzed(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [reelUrl]);

  useEffect(() => {
    if (savedReels.length === 0) {
      setAnalyzedMap({});
      setSelectedSavedUrl(null);
      setSavedPage(1);
      return;
    }

    const controller = new AbortController();

    const normalizeUrl = (url: string) => {
      try {
        const parsed = new URL(url);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
      } catch {
        return url;
      }
    };

    const loadAnalyzed = async () => {
      try {
        const response = await fetch(REELS_QUERY_URL, { signal: controller.signal });
        if (!response.ok) return;
        const items = (await response.json()) as ReelListItem[];
        const analyzed = new Set(items.map((item) => normalizeUrl(item.reelUrl)));
        const map: Record<string, boolean> = {};
        savedReels.forEach((url) => {
          map[url] = analyzed.has(normalizeUrl(url));
        });
        setAnalyzedMap(map);
        setSelectedSavedUrl((current) => current ?? savedReels[0]);
      } catch {
        setAnalyzedMap({});
      }
    };

    void loadAnalyzed();

    return () => {
      controller.abort();
    };
  }, [savedReels]);

  const analyzeReel = async (url: string) => {
    if (!url.trim().length || loading) return;

    setLoading(true);
    setError(null);
    setData(null);
    setStatus("downloading");

    const transcribeTimer = window.setTimeout(() => {
      setStatus((current) => (current === "downloading" ? "transcribing" : current));
    }, 1000);

    const summarizeTimer = window.setTimeout(() => {
      setStatus((current) => (current === "transcribing" ? "summarizing" : current));
    }, 3000);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reelUrl: url.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json()) as AnalyzeError;
        throw new Error(body.message || "Failed to analyze reel");
      }

      const payload = (await response.json()) as AnalyzeResponse;
      setData(payload);
      setStatus("done");
      setIsAnalyzed(true);
      setAnalyzedMap((current) => ({ ...current, [url]: true }));
    } catch (err) {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    } finally {
      window.clearTimeout(transcribeTimer);
      window.clearTimeout(summarizeTimer);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await analyzeReel(reelUrl);
  };

  const handleAnalyzeSavedReel = async (url: string) => {
    if (loading) return;
    setReelUrl(url);
    setHasUserEdited(true);
    await analyzeReel(url);
  };


  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => {
        setCopiedUrl((current) => (current === url ? null : current));
      }, 1200);
    } catch {
      setCopiedUrl(null);
    }
  };

  const formatUrl = (url: string) => {
    const maxLength = 44;
    if (url.length <= maxLength) return url;
    return `${url.slice(0, 26)}...${url.slice(-12)}`;
  };

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(savedReels.length / pageSize));
  const visibleSavedReels = savedReels.slice(
    (savedPage - 1) * pageSize,
    savedPage * pageSize
  );
  const activeSavedUrl = selectedSavedUrl ?? visibleSavedReels[0] ?? null;

  const handleAnalyzeNext = async () => {
    if (loading) return;
    const nextIndex = savedReels.findIndex((url) => !analyzedMap[url]);
    const next = nextIndex >= 0 ? savedReels[nextIndex] : null;
    if (!next) return;
    const nextPage = Math.floor(nextIndex / pageSize) + 1;
    setSavedPage(nextPage);
    setSelectedSavedUrl(next);
    await handleAnalyzeSavedReel(next);
  };

  useEffect(() => {
    if (savedPage > totalPages) {
      setSavedPage(totalPages);
    }
  }, [savedPage, totalPages]);

  useEffect(() => {
    if (!activeSavedUrl) return;
    if (visibleSavedReels.includes(activeSavedUrl)) return;
    setSelectedSavedUrl(visibleSavedReels[0] ?? null);
  }, [savedPage, visibleSavedReels, activeSavedUrl]);


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
        {isAnalyzed ? (
          <button
            className="button"
            type="button"
            onClick={() => window.open(DASHBOARD_URL, "_blank")}
          >
            View in Dashboard
          </button>
        ) : (
          <button className="button" disabled={!canSubmit || loading} onClick={handleSubmit}>
            {loading ? "Analyzing..." : "Analyze Reel"}
          </button>
        )}
        {loading && (
          <div className="progress-card">
            <div className="progress-title">Analysis Progress</div>
            <ul className="progress-list">
              <li className={status === "downloading" ? "active" : status === "idle" ? "" : "done"}>
                {status === "downloading" ? "→" : status === "idle" ? "•" : "✓"} Downloading video…
              </li>
              <li
                className={
                  status === "downloading"
                    ? ""
                    : status === "transcribing"
                      ? "active"
                      : status === "idle"
                        ? ""
                        : "done"
                }
              >
                {status === "transcribing"
                  ? "→"
                  : status === "idle" || status === "downloading"
                    ? "•"
                    : "✓"} Extracting audio…
              </li>
              <li className={status === "transcribing" ? "active" : status === "summarizing" || status === "done" ? "done" : ""}>
                {status === "transcribing" ? "→" : status === "summarizing" || status === "done" ? "✓" : "•"} Transcribing speech…
              </li>
              <li className={status === "summarizing" ? "active" : status === "done" ? "done" : ""}>
                {status === "summarizing" ? "→" : status === "done" ? "✓" : "•"} Generating summary…
              </li>
            </ul>
          </div>
        )}
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

      {savedCollection && (
        <section className="card">
          <div className="saved-header">
            <div>
              <div className="section-title">Saved Reels</div>
              <div className="summary">Collection: {savedCollection}</div>
            </div>
            <div className="saved-actions">
              <button
                className="ghost-button"
                onClick={handleAnalyzeNext}
                type="button"
                disabled={loading || savedReels.length === 0}
              >
                Analyze Next
              </button>
            </div>
          </div>
          <div style={{ height: 10 }} />
          {savedReels.length === 0 ? (
            <div className="status">No visible saved reels found</div>
          ) : (
            <div className="saved-list">
              {visibleSavedReels.map((url) => {
                const analyzed = Boolean(analyzedMap[url]);
                const isSelected = activeSavedUrl === url;
                return (
                  <div className={`saved-item compact ${isSelected ? "selected" : ""}`} key={url}>
                    <button
                      className={`saved-row selectable ${isSelected ? "selected" : ""}`}
                      type="button"
                      onClick={() => setSelectedSavedUrl(url)}
                    >
                      <div className="saved-url" title={url}>
                        {formatUrl(url)}
                      </div>
                      <span className={`status-pill ${analyzed ? "done" : "new"}`}>
                        {analyzed ? "Analyzed" : "New"}
                      </span>
                    </button>
                    <div className={`saved-expand ${isSelected ? "open" : ""}`}>
                      <div className="saved-expand-inner">
                        <button
                          className="ghost-button"
                          onClick={() => handleCopyUrl(url)}
                          type="button"
                        >
                          {copiedUrl === url ? "Copied" : "Copy"}
                        </button>
                        {analyzed ? (
                          <button
                            className="button saved-button"
                            type="button"
                            onClick={() => window.open(DASHBOARD_URL, "_blank")}
                          >
                            View in Dashboard
                          </button>
                        ) : (
                          <button
                            className="button saved-button"
                            disabled={loading}
                            onClick={() => handleAnalyzeSavedReel(url)}
                          >
                            {loading ? "Analyzing..." : "Analyze"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="saved-pagination">
              <div className="page-group">
                <button
                  type="button"
                  className="page-chip"
                  onClick={() => setSavedPage(1)}
                  aria-label="First page"
                  disabled={savedPage === 1}
                >
                  {"<<"}
                </button>
                <button
                  type="button"
                  className="page-chip"
                  onClick={() => setSavedPage((current) => Math.max(1, current - 1))}
                  aria-label="Previous page"
                  disabled={savedPage === 1}
                >
                  {"<"}
                </button>
              </div>
              <span className="page-indicator">
                Page {savedPage} of {totalPages}
              </span>
              <div className="page-group">
                <button
                  type="button"
                  className="page-chip"
                  onClick={() => setSavedPage((current) => Math.min(totalPages, current + 1))}
                  aria-label="Next page"
                  disabled={savedPage === totalPages}
                >
                  {">"}
                </button>
                <button
                  type="button"
                  className="page-chip"
                  onClick={() => setSavedPage(totalPages)}
                  aria-label="Last page"
                  disabled={savedPage === totalPages}
                >
                  {">>"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="footer">Powered by your local Fastify server.</footer>
    </div>
  );
}
