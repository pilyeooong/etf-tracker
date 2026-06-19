import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';

// 홈·비교 공유 — 테마/유형(카테고리) 칩 선택 섹션.
export const THEMES = ['반도체', 'AI', '2차전지', '조선', '방산', '원자력', '미국', '배당'];
export const TAGS = ['레버리지', '인버스', '커버드콜', '액티브', '배당'];

export function FilterChips({
  activeTheme,
  activeTag,
  onPickTheme,
  onPickTag,
}: {
  activeTheme: string | null;
  activeTag: string | null;
  onPickTheme: (theme: string) => void; // 테마 = 이름/종목 키워드 필터(토글)
  onPickTag: (tag: string) => void; // 유형 = 태그 토글
}) {
  return (
    <>
      <ChipRow label="테마" items={THEMES} active={activeTheme} onPick={onPickTheme} />
      <ChipRow label="유형" items={TAGS} active={activeTag} onPick={onPickTag} />
    </>
  );
}

function ChipRow({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: string[];
  active: string | null;
  onPick: (t: string) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ marginBottom: 6 }}>
        <Text typography="st12" color={colors.grey500}>
          {label}
        </Text>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((t) => {
          const on = active === t;
          return (
            <button
              key={t}
              onClick={() => onPick(t)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: on ? colors.blue500 : colors.grey100,
              }}
            >
              <Text typography="st12" fontWeight="bold" color={on ? colors.white : colors.grey700}>
                {t}
              </Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}
