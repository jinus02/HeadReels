# HeadReels — 고개로 인스타그램 릴스 넘기기

웹캠으로 머리 자세를 실시간 인식해서 인스타그램 릴스를 손 안 대고 넘기는 Chrome 확장 프로그램.

- **고개를 위로 들어 하늘 보면** → 다음 영상
- **고개를 아래로 숙여 바닥 보면** → 이전 영상

## 현재 상태 (v0.1.0)

- ✅ Chrome 확장 골격 (Manifest V3)
- ✅ popup UI — 카메라 미리보기, 임계각/유지시간/쿨다운 슬라이더, 수동 트리거 버튼
- ✅ content script — 인스타그램 페이지에 키 이벤트 + 스크롤 폴백 dispatch
- ⏳ **Face detection 미연결** — 다음 단계에서 TF.js MediaPipe Face Detector 통합 예정. 현재는 popup의 수동 버튼으로 인스타 측 동작 검증만 가능.

## 설치 (개발자 모드)

1. Chrome 주소창 → `chrome://extensions/`
2. 우상단 **개발자 모드** 토글 ON
3. **압축해제된 확장 프로그램을 로드합니다** 클릭 → 이 저장소의 `extension/` 폴더 선택
4. 확장 아이콘이 툴바에 뜨면 OK

## 사용 (현재 v0.1.0 검증 모드)

1. 인스타그램 릴스 페이지 열기 (`https://www.instagram.com/reels/`)
2. 확장 아이콘 클릭 → popup 열림
3. **시작** 버튼 → 웹캠 미리보기
4. **수동 트리거 버튼**(▲ 다음 / ▼ 이전)으로 인스타 측 키/스크롤 동작 확인

→ popup에서 직접 영상이 넘어가면 핵심 dispatch 가 동작하는 것. face detection 통합은 다음 단계에서.

## 동작 원리

```
웹캠 frame
  → MediaPipe Face Detector (예정)
  → 코·눈 keypoint → pitch 각도 추정
  → |pitch| > 임계값 + N ms 유지 + 쿨다운 통과
  → chrome.tabs.sendMessage("headreels:nav")
  → content script: KeyboardEvent dispatch + 스크롤 폴백
  → 인스타그램 릴스 다음/이전
```

## 임계값 (popup 슬라이더로 조정)

| 항목 | 기본값 | 의미 |
|------|--------|------|
| 위 임계각 | 25° | pitch가 이 값 초과 시 "위 봄" |
| 아래 임계각 | 25° | pitch가 이 값 초과 시 "아래 봄" |
| 유지 시간 | 500ms | 임계 초과 상태가 이 시간 유지돼야 trigger |
| 쿨다운 | 1500ms | 직전 trigger 후 이 시간 안엔 무시 |

## 권한 사용

- `activeTab` — 현재 탭이 인스타일 때만 동작
- `scripting` — content script 주입
- `storage` — 사용자 슬라이더 설정 저장 (예정)
- `host_permissions: https://www.instagram.com/*` — 인스타에만 동작

웹캠은 **로컬에서만** 처리합니다. 외부 서버로 영상이 전송되지 않아요.

## 로드맵

- [x] **0.1.0** — 골격 + 인스타 dispatch 검증
- [ ] **0.2.0** — TF.js MediaPipe Face Detector 통합, pitch 추정, 자동 트리거
- [ ] **0.3.0** — 사용자 calibration (정면 자세 한 번 캡처해서 baseline 저장)
- [ ] **0.4.0** — 다른 사이트 지원 (YouTube Shorts, TikTok web)
- [ ] **0.5.0** — Chrome Web Store 등록

## 개발

JS만 사용 (빌드 단계 없음). 모든 파일은 `extension/` 폴더에 정적으로 있고, Chrome 개발자 모드로 그대로 로드 가능.

## 라이선스

MIT
