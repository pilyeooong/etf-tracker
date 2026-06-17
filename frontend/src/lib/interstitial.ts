import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { AD_IDS } from '@/lib/ads';

// 전면 광고: 리스트→상세 같은 자연스러운 전환 시점에만, 빈도 제한해서 노출.
// 정책: 진입 직후/작업 중 노출 금지(Value First). 세션 첫 N회는 무광고 + 최소 간격 유지.

const FREE_VIEWS = 3; // 세션 첫 3회 진입은 광고 없이
const MIN_INTERVAL_MS = 180_000; // 노출 간 최소 3분

let loaded = false;
let viewCount = 0;
let lastShownAt = 0;

function supported(): boolean {
  try {
    return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

function preload() {
  if (!supported()) return;
  loadFullScreenAd({
    options: { adGroupId: AD_IDS.interstitial },
    onEvent: (e) => {
      if (e.type === 'loaded') loaded = true;
    },
    onError: () => {
      loaded = false;
    },
  });
}

// 앱 시작 시 1회 호출 — 광고 미리 로드
export function initInterstitial() {
  if (!supported()) return;
  preload();
}

// 상세 진입 등 전환 시점에 호출 — 빈도 조건 충족 시에만 노출
export function maybeShowInterstitial() {
  if (!supported()) return;
  viewCount += 1;
  if (viewCount <= FREE_VIEWS) return;
  if (!loaded) return;
  if (Date.now() - lastShownAt < MIN_INTERVAL_MS) return;

  loaded = false;
  lastShownAt = Date.now();
  showFullScreenAd({
    options: { adGroupId: AD_IDS.interstitial },
    onEvent: (e) => {
      if (e.type === 'dismissed') preload(); // 다음 광고 미리 로드
    },
    onError: () => preload(),
  });
}
