// HeadReels content script — instagram.com 안에 주입
// popup → background → content 메시지로 받은 nav 명령을 실제 키 dispatch + 스크롤로 변환.

console.log("[HeadReels] content script loaded");

function dispatchKey(key) {
  // 인스타그램 릴스가 듣는 키 후보 — 화살표 위/아래 + j/k. 모두 시도.
  const targets = [document.activeElement, document.body, document];
  const codes = key === "ArrowDown"
    ? [{ key: "ArrowDown", code: "ArrowDown", keyCode: 40 }, { key: "j", code: "KeyJ", keyCode: 74 }]
    : [{ key: "ArrowUp", code: "ArrowUp", keyCode: 38 }, { key: "k", code: "KeyK", keyCode: 75 }];

  for (const desc of codes) {
    for (const tgt of targets) {
      if (!tgt) continue;
      try {
        ["keydown", "keypress", "keyup"].forEach((type) => {
          tgt.dispatchEvent(
            new KeyboardEvent(type, {
              key: desc.key,
              code: desc.code,
              keyCode: desc.keyCode,
              which: desc.keyCode,
              bubbles: true,
              cancelable: true,
            })
          );
        });
      } catch (e) { /* ignore */ }
    }
  }
}

function scrollFallback(direction) {
  // 위 = 다음 영상 = 아래로 스크롤
  // 아래 = 이전 영상 = 위로 스크롤
  const dy = direction === "up" ? window.innerHeight : -window.innerHeight;

  // 인스타 릴스 컨테이너를 찾아서 그것을 스크롤 (없으면 window)
  const candidates = document.querySelectorAll('main, [role="main"], section');
  let scrolled = false;
  for (const el of candidates) {
    if (el.scrollHeight > el.clientHeight + 50) {
      el.scrollBy({ top: dy, behavior: "smooth" });
      scrolled = true;
      break;
    }
  }
  if (!scrolled) {
    window.scrollBy({ top: dy, behavior: "smooth" });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "headreels:nav") return false;
  const dir = msg.direction === "up" ? "up" : "down";

  // 1차: 키 이벤트
  dispatchKey(dir === "up" ? "ArrowDown" : "ArrowUp");
  // 2차: 스크롤 폴백 (소량 시간차)
  setTimeout(() => scrollFallback(dir), 100);

  sendResponse({ ok: true, method: "key+scroll" });
  return true; // async sendResponse 가능성
});
