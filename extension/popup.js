// HeadReels popup — v0.1
// 현재 단계: 골격 + 인스타 키 dispatch 검증.
// 다음 단계: TF.js MediaPipe Face Detector 통합 + pitch 추정.
//
// popup은 영역 밖 클릭 시 닫혀서 권한 dialog가 dismiss됨 → 시작 버튼은
// `?cam=1` query로 정식 windows.create 창을 띄워 그 창에서 카메라를 다룬다.
// 정식 창은 영역 밖 클릭에 안 닫혀서 권한 dialog 처리 정상.

const $ = (id) => document.getElementById(id);
const isPopup = !new URLSearchParams(location.search).has("cam");
const cam = $("cam");
const overlay = $("overlay");
const statusEl = $("status");
const events = $("events");

const settings = {
  upDeg: 25,
  downDeg: 25,
  hold: 500,
  cooldown: 1500,
};

const state = {
  detector: null,
  raf: null,
  stream: null,
  lastTrigger: 0,
  upHoldStart: null,
  downHoldStart: null,
};

function log(text, cls = "") {
  const li = document.createElement("li");
  if (cls) li.className = cls;
  const ts = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  li.textContent = `${ts} ${text}`;
  events.prepend(li);
  while (events.children.length > 30) events.removeChild(events.lastChild);
}

function bindRange(id) {
  const input = $(id);
  const valEl = $(id + "Val");
  input.addEventListener("input", () => {
    settings[id] = Number(input.value);
    valEl.textContent = input.value;
  });
  settings[id] = Number(input.value);
}

bindRange("upDeg");
bindRange("downDeg");
bindRange("hold");
bindRange("cooldown");

async function dispatchToInstagram(direction) {
  // direction: "up" (다음 영상) | "down" (이전 영상)
  try {
    // 모든 창의 인스타 탭 중 가장 최근 활성 탭 사용 — 정식 창에서도 동작
    const tabs = await chrome.tabs.query({
      url: ["https://www.instagram.com/*"],
    });
    if (tabs.length === 0) {
      log("인스타그램 탭 없음 — 먼저 instagram.com/reels/ 여세요", "err");
      return;
    }
    // active 우선 + 가장 최근 사용
    tabs.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    const tab = tabs[0];
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: "headreels:nav",
      direction,
    });
    log(`${direction === "up" ? "▲ 다음" : "▼ 이전"} → ${res?.method || "?"}`, direction);
  } catch (exc) {
    log("dispatch 실패: " + exc.message, "err");
  }
}

$("manualUp").addEventListener("click", () => dispatchToInstagram("up"));
$("manualDown").addEventListener("click", () => dispatchToInstagram("down"));

async function startCam() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" },
      audio: false,
    });
    cam.srcObject = state.stream;
    await cam.play();
    overlay.width = cam.videoWidth || 320;
    overlay.height = cam.videoHeight || 240;
    statusEl.textContent = "카메라 동작 중 (face detection 미연결 — 다음 단계)";
    log("camera on");
    $("start").disabled = true;
    $("stop").disabled = false;
  } catch (exc) {
    log("camera 실패: " + exc.message, "err");
    statusEl.textContent = "camera 실패";
  }
}

function stopCam() {
  if (state.raf) cancelAnimationFrame(state.raf);
  if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
  state.stream = null;
  cam.srcObject = null;
  statusEl.textContent = "대기 중";
  log("camera off");
  $("start").disabled = false;
  $("stop").disabled = true;
}

async function openCamWindow() {
  // popup → 정식 창으로 띄움 (popup 닫힘으로 인한 권한 dialog dismiss 회피)
  await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html?cam=1"),
    type: "popup",
    width: 420,
    height: 760,
  });
  window.close();
}

$("start").addEventListener("click", () => {
  if (isPopup) openCamWindow();
  else startCam();
});
$("stop").addEventListener("click", stopCam);

// 정식 창으로 진입한 경우 자동으로 카메라 시작 (사용자가 시작 또 누를 필요 없음)
if (!isPopup) {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(startCam, 150);
  }, { once: true });
  // DOMContentLoaded가 이미 지났을 수도
  if (document.readyState !== "loading") {
    setTimeout(startCam, 150);
  }
}

// -- 다음 단계 placeholder --
// estimatePitch(video) -> degrees (양수=위, 음수=아래)
// 매 frame: pitch 추정 → 임계 초과 + hold 시간 충족 + cooldown 통과 → dispatchToInstagram
