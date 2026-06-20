import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { AD_IDS, AD_MOCK, isFullScreenAdSupported } from '@/lib/ads';
import { showMockFullScreenAd } from '@/lib/mockAd';

// 전면 광고: 리스트→상세 같은 자연스러운 전환 시점에만, 빈도 제한해서 노출.
// 정책: 진입 직후/작업 중 노출 금지(Value First). 세션 첫 N회는 무광고 + 최소 간격 유지.
// dev(AD_MOCK)에서는 실제 SDK가 없어도 목 전면 광고로 타이밍을 확인할 수 있게 하고,
// 빠르게 검증되도록 임계값을 낮춰요(첫 1회 후, 최소 간격 15초).

const FREE_VIEWS = AD_MOCK ? 1 : 3; // 세션 첫 N회 진입은 광고 없이
const MIN_INTERVAL_MS = AD_MOCK ? 15_000 : 180_000; // 노출 간 최소 간격

let loaded = false;
let viewCount = 0;
let lastShownAt = 0;
let showing = false;

function preload() {
  if (!isFullScreenAdSupported()) return;
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
  if (isFullScreenAdSupported()) {
    preload();
    return;
  }
  if (AD_MOCK) loaded = true; // 목: 항상 준비됨
}

// 상세 진입 등 전환 시점에 호출 — 빈도 조건 충족 시에만 노출
export function maybeShowInterstitial() {
  const real = isFullScreenAdSupported();
  if (!real && !AD_MOCK) return;

  viewCount += 1;
  if (viewCount <= FREE_VIEWS) return;
  if (showing) return;
  if (Date.now() - lastShownAt < MIN_INTERVAL_MS) return;

  // dev 목 전면 광고
  if (!real) {
    showing = true;
    lastShownAt = Date.now();
    showMockFullScreenAd('전면', 3).finally(() => {
      showing = false;
    });
    return;
  }

  if (!loaded) return;
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
