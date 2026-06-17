import { useEffect, useRef, useState } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';
import { AD_IDS } from '@/lib/ads';

// 인라인 배너 광고 (web-base 표준 컴포넌트). 토스 앱 5.241.0+ 에서만 동작.
// 미지원 환경(브라우저/구버전)에서는 아무것도 렌더하지 않아요.
let initialized = false;

export function BannerSlot({ adGroupId = AD_IDS.banner }: { adGroupId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [supported] = useState(() => {
    try {
      return TossAds.attachBanner.isSupported();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!supported || !ref.current) return;

    if (!initialized && TossAds.initialize.isSupported()) {
      TossAds.initialize({ callbacks: { onInitialized: () => {} } });
      initialized = true;
    }

    const attached = TossAds.attachBanner(adGroupId, ref.current, {
      theme: 'auto',
      tone: 'blackAndWhite',
      variant: 'card',
    });
    return () => attached?.destroy();
  }, [supported, adGroupId]);

  if (!supported) return null;
  // 컨테이너: width 100%, 고정형 height 96px (가이드 권장)
  return <div ref={ref} style={{ width: '100%', height: 96, margin: '8px 0' }} />;
}
