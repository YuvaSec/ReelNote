type ReelUrlDetectedMessage = {
  type: "REEL_URL_DETECTED";
  url: string;
};

type RequestReelUrlMessage = {
  type: "REQUEST_REEL_URL";
};

type SavedReelsDetectedMessage = {
  type: "SAVED_REELS_DETECTED";
  collection: string;
  reelUrls: string[];
};

type RequestSavedReelsMessage = {
  type: "REQUEST_SAVED_REELS";
};

const isReelUrl = (url: string) =>
  url.includes("/reel/") || url.includes("/reels/") || url.includes("/p/");

const isSavedUrl = (url: string) => url.includes("/saved");

const titleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const sendReelUrlIfAvailable = () => {
  const currentUrl = window.location.href;
  if (!isReelUrl(currentUrl)) return;

  const message: ReelUrlDetectedMessage = {
    type: "REEL_URL_DETECTED",
    url: currentUrl,
  };

  chrome.runtime.sendMessage(message);
};

sendReelUrlIfAvailable();

const extractSavedCollectionName = (): string => {
  const urlMatch = window.location.pathname.match(/\/saved\/([^/]+)\//);
  if (urlMatch?.[1]) {
    const raw = decodeURIComponent(urlMatch[1]).replace(/[-_]+/g, " ").trim();
    if (raw.length > 0 && raw.toLowerCase() !== "saved") {
      return titleCase(raw);
    }
  }

  const ariaSelected = document.querySelector<HTMLElement>("[aria-selected='true']");
  const text = ariaSelected?.textContent?.trim();
  if (text) return text;

  const heading = document.querySelector<HTMLElement>(
    "main h1, main h2, header h1, header h2, h1, h2"
  );
  const headingText = heading?.textContent?.trim();
  if (headingText) return headingText;

  return "All Saved";
};

const extractSavedReelUrls = (): string[] => {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
  const urls = anchors
    .map((anchor) => anchor.getAttribute("href") || "")
    .filter((href) => href.length > 0)
    .map((href) => new URL(href, window.location.origin))
    .filter((url) => /\/reels?\/[^/?#]+/.test(url.pathname) || /\/p\/[^/?#]+/.test(url.pathname))
    .map((url) => {
      url.search = "";
      url.hash = "";
      return url.toString();
    });

  return Array.from(new Set(urls));
};

const sendSavedReelsIfAvailable = () => {
  const currentUrl = window.location.href;
  if (!isSavedUrl(currentUrl)) return;

  const reelUrls = extractSavedReelUrls();
  if (reelUrls.length === 0) return;

  lastSavedSignature = reelUrls.join("|");

  const message: SavedReelsDetectedMessage = {
    type: "SAVED_REELS_DETECTED",
    collection: extractSavedCollectionName(),
    reelUrls,
  };

  chrome.runtime.sendMessage(message);
};

sendSavedReelsIfAvailable();

let lastSavedSignature = "";
let savedScrollTimer: number | null = null;

const handleSavedScroll = () => {
  if (!isSavedUrl(window.location.href)) return;

  if (savedScrollTimer) {
    window.clearTimeout(savedScrollTimer);
  }

  savedScrollTimer = window.setTimeout(() => {
    const reelUrls = extractSavedReelUrls();
    const signature = reelUrls.join("|");
    if (signature === lastSavedSignature) return;
    lastSavedSignature = signature;

    const message: SavedReelsDetectedMessage = {
      type: "SAVED_REELS_DETECTED",
      collection: extractSavedCollectionName(),
      reelUrls,
    };

    chrome.runtime.sendMessage(message);
  }, 400);
};

window.addEventListener("scroll", handleSavedScroll, { passive: true });

chrome.runtime.onMessage.addListener(
  (
    message: RequestReelUrlMessage | RequestSavedReelsMessage,
    _sender,
    sendResponse
  ) => {
    if (message?.type === "REQUEST_REEL_URL") {
      const currentUrl = window.location.href;
      if (!isReelUrl(currentUrl)) {
        sendResponse({ url: null });
        return;
      }

      sendResponse({ url: currentUrl });
      return;
    }

    if (message?.type === "REQUEST_SAVED_REELS") {
      const currentUrl = window.location.href;
      if (!isSavedUrl(currentUrl)) {
        sendResponse({ collection: null, reelUrls: [] });
        return;
      }

      sendResponse({
        collection: extractSavedCollectionName(),
        reelUrls: extractSavedReelUrls(),
      });
    }
  }
);
