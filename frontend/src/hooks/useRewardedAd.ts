import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { AD_IDS, AD_MOCK } from '@/lib/ads';
import { showMockFullScreenAd } from '@/lib/mockAd';

// 보상형 광고 (인앱 광고 2.0 ver2). 전면형과 동일 API, adGroupId로 타입 결정.
// 미지원 환경(브라우저/구버전 토스앱)에서는 광고 없이 즉시 보상 처리(개발·폴백).
export type RewardStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'rewarded' | 'error';

function supported(): boolean {
  try {
    return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

export function useRewardedAd() {
  const [status, setStatus] = useState<RewardStatus>('idle');
  const isSupported = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  // 마운트 시 미리 로드
  useEffect(() => {
    isSupported.current = supported();
    if (!isSupported.current) {
      setStatus('loaded'); // 미지원: 바로 보여줄 수 있는 상태(광고 생략)
      return;
    }
    setStatus('loading');
    cleanup.current = loadFullScreenAd({
      options: { adGroupId: AD_IDS.rewarded },
      onEvent: (e) => {
        if (e.type === 'loaded') setStatus('loaded');
      },
      onError: () => setStatus('error'),
    });
    return () => cleanup.current?.();
  }, []);

  const showAd = useCallback(() => {
    if (status !== 'loaded') return;
    // 미지원 환경: dev는 목 광고 재생 후 보상, prod는 광고 없이 즉시 보상
    if (!isSupported.current) {
      if (AD_MOCK) {
        setStatus('showing');
        showMockFullScreenAd('보상형', 3).then(() => setStatus('rewarded'));
      } else {
        setStatus('rewarded');
      }
      return;
    }
    setStatus('showing');
    let earned = false;
    showFullScreenAd({
      options: { adGroupId: AD_IDS.rewarded },
      onEvent: (e) => {
        switch (e.type) {
          case 'userEarnedReward':
            earned = true;
            setStatus('rewarded');
            break;
          case 'dismissed':
            if (!earned) setStatus('loaded'); // 보상 전 닫음 → 재시도 가능
            break;
          case 'failedToShow':
            setStatus('error');
            break;
        }
      },
      onError: () => setStatus('error'),
    });
  }, [status]);

  return { status, showAd };
}
