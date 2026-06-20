import { useCallback, useState, type FormEvent } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { searchEtfs } from '@/lib/queries';

// 홈·비교 화면이 공유하는 ETF 검색 상태/핸들러.
// - input: 입력창 텍스트(타이핑 중)  /  query: 제출된 검색어(실제 조회 트리거)
//   둘을 분리해 타이핑마다 요청하지 않음(디바운스 대체).
// - theme: 입력창을 채우지 않고 키워드로만 검색에 반영(활성 칩으로 표시)
// - tag/theme/query는 상호 배타 — 하나를 고르면 나머지를 리셋.
export function useEtfSearch() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);

  const isSearching = Boolean(query.trim() || tag || theme);
  const result = useAsync(() => searchEtfs(theme ?? query, tag), [query, tag, theme]);

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setTag(null);
      setTheme(null);
      setQuery(input);
    },
    [input],
  );

  const pickTheme = useCallback((t: string) => {
    setInput('');
    setQuery('');
    setTag(null);
    setTheme((cur) => (cur === t ? null : t));
  }, []);

  const pickTag = useCallback((t: string) => {
    setInput('');
    setQuery('');
    setTheme(null);
    setTag((cur) => (cur === t ? null : t));
  }, []);

  const reset = useCallback(() => {
    setInput('');
    setQuery('');
    setTag(null);
    setTheme(null);
  }, []);

  return { input, setInput, query, tag, theme, isSearching, result, submit, pickTheme, pickTag, reset };
}
