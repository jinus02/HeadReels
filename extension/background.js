// HeadReels background service worker — Manifest V3
// 현재는 단순 keep-alive. popup ↔ content 메시지는 popup이 chrome.tabs.sendMessage로 직접.

chrome.runtime.onInstalled.addListener(() => {
  console.log("[HeadReels] installed");
});
