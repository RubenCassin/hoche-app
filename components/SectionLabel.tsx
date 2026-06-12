import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { OcheText } from './OcheText';
import { useTheme } from '@/hooks/useTheme';

export type SectionIconName =
  | 'grid' | 'target' | 'flag' | 'heart' | 'clock'
  | 'sliders' | 'hash' | 'layers' | 'trophy' | 'users';

/** Small line icon used to decorate section headings across config screens. */
export function SectionIcon({ name, color, size = 15 }: { name: SectionIconName; color: string; size?: number }) {
  const sw = 1.7;
  const c = { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const svg = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">{children}</Svg>
  );
  switch (name) {
    case 'grid':
      return svg(
        <>
          <Rect x="4" y="4" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
          <Rect x="13" y="4" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
          <Rect x="4" y="13" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
          <Rect x="13" y="13" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
        </>
      );
    case 'target':
      return svg(
        <>
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={sw} />
          <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={sw} />
          <Circle cx="12" cy="12" r="1.4" fill={color} />
        </>
      );
    case 'flag':
      return svg(
        <>
          <Path d="M6 21V4" {...c} />
          <Path d="M6 4h11l-2 4 2 4H6" {...c} />
        </>
      );
    case 'heart':
      return svg(<Path d="M12 20s-6.6-4.3-6.6-9.1A3.6 3.6 0 0 1 12 8.1a3.6 3.6 0 0 1 6.6 2.8C18.6 15.7 12 20 12 20z" {...c} />);
    case 'clock':
      return svg(
        <>
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={sw} />
          <Path d="M12 7v5l3.2 2" {...c} />
        </>
      );
    case 'sliders':
      return svg(
        <>
          <Path d="M4 8h16" {...c} />
          <Path d="M4 16h16" {...c} />
          <Circle cx="9" cy="8" r="2.3" stroke={color} strokeWidth={sw} />
          <Circle cx="15" cy="16" r="2.3" stroke={color} strokeWidth={sw} />
        </>
      );
    case 'hash':
      return svg(
        <>
          <Path d="M9.5 4 7.5 20" {...c} />
          <Path d="M16.5 4 14.5 20" {...c} />
          <Path d="M4 9.5h16" {...c} />
          <Path d="M3.5 15h16" {...c} />
        </>
      );
    case 'layers':
      return svg(
        <>
          <Path d="M12 3 21 8 12 13 3 8Z" {...c} />
          <Path d="M3 12 12 17 21 12" {...c} />
          <Path d="M3 16 12 21 21 16" {...c} />
        </>
      );
    case 'trophy':
      return svg(
        <>
          <Path d="M7 4h10v3a5 5 0 0 1-10 0z" {...c} />
          <Path d="M7 5H4.5v1.5A2.5 2.5 0 0 0 7 8.5" {...c} />
          <Path d="M17 5h2.5v1.5A2.5 2.5 0 0 1 17 8.5" {...c} />
          <Path d="M12 12v7" {...c} />
          <Path d="M9 19h6" {...c} />
        </>
      );
    case 'users':
      return svg(
        <>
          <Circle cx="9" cy="8" r="3.2" stroke={color} strokeWidth={sw} />
          <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...c} />
          <Path d="M16 5.5a3.2 3.2 0 0 1 0 6.2" {...c} />
          <Path d="M17 14.2c2.2.5 3.8 2.3 3.8 4.8" {...c} />
        </>
      );
  }
}

/**
 * Section heading: small accent icon + uppercase label. `variant`/`size` let it
 * stand in for both the small param labels and the bigger list-section titles.
 */
export function SectionLabel({
  icon,
  children,
  variant = 'labelMd',
  iconColor,
  iconSize = 15,
}: {
  icon: SectionIconName;
  children: React.ReactNode;
  variant?: 'labelMd' | 'h5';
  iconColor?: string;
  iconSize?: number;
}) {
  const C = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <SectionIcon name={icon} color={iconColor ?? C.amber} size={iconSize} />
      <OcheText variant={variant} allCaps color={C.fg2} style={{ letterSpacing: 1 }}>
        {children}
      </OcheText>
    </View>
  );
}
