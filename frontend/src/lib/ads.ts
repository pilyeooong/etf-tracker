// 광고 그룹 ID — dev/prod 분기.
// 개발·심사 단계(dev)에서는 반드시 테스트 ID를 사용해요(실제 ID로 테스트 시 정책 위반).
// 프로덕션 빌드에서는 콘솔에서 발급받은 prod ID를 .env(VITE_AD_*)로 주입해요.
//   - 미주입 시 테스트 ID로 폴백(노출은 되지만 수익 X) → 콘솔 발급 후 반드시 채울 것.

import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

const IS_PROD = import.meta.env.MODE === 'production';

// 전면/보상형 풀스크린 광고 SDK 지원 여부(미지원 환경=브라우저/구버전 토스앱).
export function isFullScreenAdSupported(): boolean {
  try {
    return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

// 개발 목(mock) 광고 모드. 실제 광고 SDK가 없는 브라우저(dev)에서 광고 '위치/타이밍/흐름'을
// 눈으로 확인하기 위한 가짜 광고를 켜요. 프로덕션 빌드에서는 항상 false → 절대 노출 안 됨.
export const AD_MOCK = import.meta.env.DEV;

function adId(testId: string, prodId: string | undefined): string {
  // dev/sandbox: 항상 테스트 ID / prod: 주입된 prod ID(없으면 테스트 폴백)
  return IS_PROD ? prodId || testId : testId;
}

export const AD_IDS = {
  // 배너 — 리스트형(텍스트 띠)
  banner: adId('ait-ad-test-banner-id', import.meta.env.VITE_AD_BANNER_ID),
  // 배너 — 피드형(네이티브 이미지)
  nativeImage: adId('ait-ad-test-native-image-id', import.meta.env.VITE_AD_NATIVE_ID),
  // 전면형
  interstitial: adId('ait-ad-test-interstitial-id', import.meta.env.VITE_AD_INTERSTITIAL_ID),
  // 보상형(리워드)
  rewarded: adId('ait-ad-test-rewarded-id', import.meta.env.VITE_AD_REWARDED_ID),
};
