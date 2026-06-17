// 라인형 벡터 아이콘 (currentColor 상속, 토스 톤). 이모지 대신 사용.
interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function HomeIcon({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="m16.5 16.5 3.5 3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
