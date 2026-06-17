import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, SearchIcon } from '@/components/icons';

interface NavItem {
  path: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
}

const ITEMS: NavItem[] = [
  { path: '/', label: '홈', Icon: HomeIcon },
  { path: '/search', label: '검색', Icon: SearchIcon },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        borderTop: '1px solid #f2f4f6',
        background: '#fff',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 10,
      }}
    >
      {ITEMS.map(({ path, label, Icon }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
        const color = active ? '#3182f6' : '#8b95a1';
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              padding: '10px 0 12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color,
              fontWeight: active ? 700 : 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Icon size={22} color={color} />
            <span style={{ fontSize: 11 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
