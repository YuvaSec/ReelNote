import { useEffect, useMemo, useState } from "react";
import { deleteReelById, fetchReelById, fetchReels } from "./api";
import ReelDetail from "./components/ReelDetail";
import ReelList from "./components/ReelList";
import type { ReelAnalysis } from "./types";

export default function App() {
  const UNDO_TIMEOUT_MS = 8000;
  const [reels, setReels] = useState<ReelAnalysis[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<ReelAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    reel: ReelAnalysis;
    timeoutId: number;
  } | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadReels = async () => {
      try {
        const data = await fetchReels();
        if (!isMounted) return;
        setReels(data);
        setSelectedId(data[0]?.id ?? null);
        const topicMap = new Map<string, string>();
        data.forEach((reel) => {
          (reel.topics ?? []).forEach((topic) => {
            const normalized = topic.trim().toLowerCase();
            if (!normalized) return;
            if (!topicMap.has(normalized)) {
              topicMap.set(normalized, topic.trim());
            }
          });
        });
        setTopics(Array.from(topicMap.values()));
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Failed to load reels";
        setError(message);
      }
    };

    void loadReels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!selectedId) {
        setSelectedReel(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const detail = await fetchReelById(selectedId);
        if (!isMounted) return;
        setSelectedReel(detail);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Failed to load reel";
        setError(message);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  const hasReels = useMemo(() => reels.length > 0, [reels.length]);
  const filteredReels = useMemo(() => {
    const byTopic =
      selectedTopic === "ALL"
        ? reels
        : reels.filter((reel) =>
            (reel.topics ?? []).some(
              (topic) => topic.trim().toLowerCase() === selectedTopic.trim().toLowerCase()
            )
          );

    const query = searchQuery.trim().toLowerCase();
    if (!query) return byTopic;

    return byTopic.filter((reel) => {
      const summary = reel.summary?.toLowerCase() ?? "";
      const transcript = reel.transcript?.toLowerCase() ?? "";
      const topicsText = (reel.topics ?? []).join(" ").toLowerCase();
      return (
        summary.includes(query) || transcript.includes(query) || topicsText.includes(query)
      );
    });
  }, [reels, selectedTopic, searchQuery]);

  const handleRequestDelete = () => {
    if (!selectedReel) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedReel) return;
    const reelToDelete = selectedReel;
    const updated = reels.filter((item) => item.id !== reelToDelete.id);
    setReels(updated);
    setSelectedId(updated[0]?.id ?? null);
    setShowDeleteModal(false);
    const timeoutId = window.setTimeout(async () => {
      try {
        await deleteReelById(reelToDelete.id);
        setUndoCountdown(0);
        window.setTimeout(() => {
          setPendingDelete(null);
        }, 600);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete reel";
        setError(message);
        setReels((current) => [reelToDelete, ...current]);
        setSelectedId(reelToDelete.id);
        setPendingDelete(null);
        setUndoCountdown(0);
      }
    }, UNDO_TIMEOUT_MS);
    setPendingDelete({ reel: reelToDelete, timeoutId });
    setUndoCountdown(Math.ceil(UNDO_TIMEOUT_MS / 1000));
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;
    window.clearTimeout(pendingDelete.timeoutId);
    setReels((current) => [pendingDelete.reel, ...current]);
    setSelectedId(pendingDelete.reel.id);
    setPendingDelete(null);
    setUndoCountdown(0);
  };

  useEffect(() => {
    if (!pendingDelete) return;
    setUndoCountdown(Math.ceil(UNDO_TIMEOUT_MS / 1000));
    const intervalId = window.setInterval(() => {
      setUndoCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pendingDelete, UNDO_TIMEOUT_MS]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reel Dashboard</h1>
          <p>Browse saved reel analyses and revisit insights anytime.</p>
        </div>
        <div className="header-meta">{hasReels ? `${reels.length} reels` : "No reels"}</div>
      </header>

      <main className="layout">
        <aside className="panel list-panel">
          <div className="panel-title">Analyzed Reels</div>
          {error && !selectedReel && <div className="detail-error">{error}</div>}
          <div className="filter-block">
            <div className="filter-label">Filter by topic</div>
            <div className="search-row">
              <input
                className="search-input"
                placeholder="Search reels..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <svg
                    className="search-clear-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedTopic === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedTopic("ALL")}
              >
                All
              </button>
              {topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className={`filter-chip ${selectedTopic === topic ? "active" : ""}`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
          {filteredReels.length === 0 ? (
            <div className="empty-state">
              {searchQuery.trim().length > 0
                ? "No reels match your search"
                : "No reels found for this topic"}
            </div>
          ) : (
            <ReelList reels={filteredReels} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </aside>
        <section className="panel detail-panel">
          <ReelDetail
            reel={selectedReel}
            loading={loading}
            error={error}
            onDelete={handleRequestDelete}
            deleteDisabled={Boolean(pendingDelete)}
          />
        </section>
      </main>

      {showDeleteModal && selectedReel && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Delete this reel?</div>
            <div className="modal-text">
              This will permanently remove the analysis for this reel. This action cannot be undone.
            </div>
            <div className="modal-actions">
              <button className="modal-button ghost" onClick={handleCancelDelete} type="button">
                Cancel
              </button>
              <button className="modal-button danger" onClick={handleConfirmDelete} type="button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className={`toast ${undoCountdown === 0 ? "fade-out" : ""}`}>
          <div className="toast-progress">
            <div className={`toast-text ${undoCountdown <= 3 ? "warning" : ""}`}>
              <span className="toast-dot" aria-hidden="true" />
              Reel deleted
            </div>
            <div
              className={`toast-bar ${undoCountdown <= 3 ? "warning" : ""}`}
              key={pendingDelete.reel.id}
            >
              <div
                className="toast-bar-fill"
                style={{ animationDuration: `${UNDO_TIMEOUT_MS}ms` }}
              />
            </div>
            <div className="toast-time" aria-label={`Undo in ${undoCountdown} seconds`}>
              Undo in {undoCountdown}s
            </div>
          </div>
          <button className="toast-button" onClick={handleUndoDelete} type="button">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
