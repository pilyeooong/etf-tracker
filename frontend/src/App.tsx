import { useEffect } from 'react';
// BrowserRouter(경로 기반): 딥링크 intoss://etf-insight/<path> → 해당 라우트 (앱인토스 앱 내 기능)
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { HomePage } from '@/pages/HomePage';
import { ComparePage } from '@/pages/ComparePage';
import { DetailPage } from '@/pages/DetailPage';
import { initInterstitial } from '@/lib/interstitial';

function App() {
  useEffect(() => {
    initInterstitial(); // 전면 광고 미리 로드 (미지원 환경은 자동 무시)
  }, []);

  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#fff' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/etf/:code" element={<DetailPage />} />
          {/* 미정의 경로(구 딥링크 등)는 홈으로 */}
          <Route path="*" element={<HomePage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
