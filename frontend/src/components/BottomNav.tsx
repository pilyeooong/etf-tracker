import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
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
        borderTop: `1px solid ${colors.grey100}`,
        background: colors.white,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 10,
      }}
    >
      {ITEMS.map(({ path, label, Icon }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
        const color = active ? colors.blue500 : colors.grey500;
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Icon size={22} color={color} />
            <Text typography="st13" fontWeight={active ? 'bold' : 'medium'} color={color}>
              {label}
            </Text>
          </button>
        );
      })}
    </nav>
  );
}
