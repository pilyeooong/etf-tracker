// 광고 그룹 ID.
// 개발·심사 단계에서는 반드시 테스트 ID를 사용해요(실제 ID로 테스트 시 정책 위반).
// 출시 시 콘솔에서 발급받은 prod ID를 .env(VITE_AD_*)로 주입하면 자동 교체돼요.

const TEST = {
  banner: 'ait-ad-test-banner-id',
  interstitial: 'ait-ad-test-interstitial-id',
};

export const AD_IDS = {
  banner: import.meta.env.VITE_AD_BANNER_ID || TEST.banner,
  interstitial: import.meta.env.VITE_AD_INTERSTITIAL_ID || TEST.interstitial,
};
