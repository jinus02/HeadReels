// HeadReels popup — v0.1
// 현재 단계: 골격 + 인스타 키 dispatch 검증.
// 다음 단계: TF.js MediaPipe Face Detector 통합 + pitch 추정.

const $ = (id) => document.getElementById(id);
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      log("활성 탭 없음", "err");
      return;
    }
    if (!/^https:\/\/www\.instagram\.com\//.test(tab.url || "")) {
      log("인스타그램 탭 아님: " + (tab.url || "?"), "err");
      return;
    }
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

$("start").addEventListener("click", startCam);
$("stop").addEventListener("click", stopCam);

// -- 다음 단계 placeholder --
// estimatePitch(video) -> degrees (양수=위, 음수=아래)
// 매 frame: pitch 추정 → 임계 초과 + hold 시간 충족 + cooldown 통과 → dispatchToInstagram
