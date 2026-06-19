import { AD_MOCK } from '@/lib/ads';

// 개발 전용 가짜 전체화면 광고 오버레이.
// 실제 광고 SDK가 없는 브라우저에서 '전면/보상형 광고가 언제 어떻게 뜨는지'와
// 보상/닫힘 흐름을 눈으로 확인하기 위함. 프로덕션 빌드(AD_MOCK=false)에서는 호출돼도 즉시 resolve.
type MockKind = '전면' | '보상형';

export function showMockFullScreenAd(kind: MockKind, seconds = 3): Promise<'completed' | 'dismissed'> {
  return new Promise((resolve) => {
    if (!AD_MOCK || typeof document === 'undefined') {
      resolve('completed');
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9999',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:14px',
      'padding:24px',
      'background:rgba(17,23,30,0.94)',
      'color:#fff',
      'font-family:system-ui,-apple-system,sans-serif',
      'text-align:center',
    ].join(';');

    const badge = document.createElement('div');
    badge.textContent = 'AD · 테스트';
    badge.style.cssText =
      'font-size:12px;letter-spacing:0.04em;color:#8b95a1;border:1px solid #4e5968;border-radius:999px;padding:4px 12px';

    const title = document.createElement('div');
    title.textContent = `${kind} 광고 (개발용 미리보기)`;
    title.style.cssText = 'font-size:17px;font-weight:700';

    const sub = document.createElement('div');
    sub.textContent = '실기기(토스 앱)에서는 실제 광고가 노출돼요.';
    sub.style.cssText = 'font-size:12px;color:#8b95a1';

    const count = document.createElement('div');
    count.style.cssText = 'font-size:13px;color:#b0b8c1;min-height:18px';

    const action = document.createElement('button');
    action.style.cssText =
      'margin-top:8px;padding:11px 22px;border:none;border-radius:12px;background:#3182f6;color:#fff;font-size:15px;font-weight:700;cursor:pointer;opacity:0.45';
    action.disabled = true;

    overlay.append(badge, title, sub, count, action);
    document.body.appendChild(overlay);

    const finishLabel = kind === '보상형' ? '보상 받기' : '닫기';
    let remaining = seconds;

    const paint = () => {
      if (remaining > 0) {
        count.textContent = `${remaining}초 후 ${finishLabel} 가능`;
        action.textContent = `${finishLabel} (${remaining})`;
      } else {
        count.textContent = '';
        action.textContent = finishLabel;
        action.disabled = false;
        action.style.opacity = '1';
      }
    };
    paint();

    const timer = window.setInterval(() => {
      remaining -= 1;
      paint();
      if (remaining <= 0) window.clearInterval(timer);
    }, 1000);

    const close = (result: 'completed' | 'dismissed') => {
      window.clearInterval(timer);
      overlay.remove();
      resolve(result);
    };
    action.onclick = () => {
      if (!action.disabled) close('completed');
    };
    // 전면형은 카운트다운 후 백드롭으로도 닫힘(보상형은 완료 버튼만)
    if (kind === '전면') {
      overlay.onclick = (e) => {
        if (e.target === overlay && !action.disabled) close('dismissed');
      };
    }
  });
}
