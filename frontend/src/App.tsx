import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { DetailPage } from '@/pages/DetailPage';
import { initInterstitial } from '@/lib/interstitial';

function App() {
  useEffect(() => {
    initInterstitial(); // 전면 광고 미리 로드 (미지원 환경은 자동 무시)
  }, []);

  return (
    <HashRouter>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#fff' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/etf/:code" element={<DetailPage />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
