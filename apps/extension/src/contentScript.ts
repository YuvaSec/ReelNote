type ReelUrlDetectedMessage = {
  type: "REEL_URL_DETECTED";
  url: string;
};

type RequestReelUrlMessage = {
  type: "REQUEST_REEL_URL";
};

const isReelUrl = (url: string) =>
  url.includes("/reel/") || url.includes("/reels/") || url.includes("/p/");

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

chrome.runtime.onMessage.addListener((message: RequestReelUrlMessage, _sender, sendResponse) => {
  if (message?.type !== "REQUEST_REEL_URL") return;

  const currentUrl = window.location.href;
  if (!isReelUrl(currentUrl)) {
    sendResponse({ url: null });
    return;
  }

  sendResponse({ url: currentUrl });
});
