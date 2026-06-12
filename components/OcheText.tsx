import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { FontSizes } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type Variant =
  | 'displayXXL' | 'displayXL' | 'displayLg' | 'displayMd' | 'displaySm'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
  | 'bodyLg' | 'bodyMd' | 'bodySm' | 'bodyXS'
  | 'labelLg' | 'labelMd' | 'labelSm'
  | 'monoMd' | 'monoSm';

interface OcheTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  allCaps?: boolean;
  style?: TextStyle | TextStyle[];
}

const displayVariants = ['displayXXL', 'displayXL', 'displayLg', 'displayMd', 'displaySm'];
const monoVariants = ['monoMd', 'monoSm'];

// Weight → bundled font family. The real brand type is shipped per-weight, so we
// pick the exact family that carries the weight (RN can't synthesize it reliably).
const FONT_BY_WEIGHT = {
  display: {
    700: 'BigShouldersDisplay_700Bold',
    800: 'BigShouldersDisplay_800ExtraBold',
    900: 'BigShouldersDisplay_900Black',
  },
  body: {
    400: 'Manrope_400Regular',
    500: 'Manrope_500Medium',
    600: 'Manrope_600SemiBold',
    700: 'Manrope_700Bold',
    800: 'Manrope_800ExtraBold',
  },
  mono: {
    400: 'JetBrainsMono_400Regular',
    500: 'JetBrainsMono_500Medium',
    700: 'JetBrainsMono_700Bold',
  },
} as const;

type FontCategory = keyof typeof FONT_BY_WEIGHT;

/** Resolve the nearest available weight family for a category. */
function pickFontFamily(category: FontCategory, weight: number): string {
  const table = FONT_BY_WEIGHT[category] as Record<number, string>;
  const weights = Object.keys(table).map(Number);
  let best = weights[0];
  for (const w of weights) {
    if (Math.abs(w - weight) < Math.abs(best - weight)) best = w;
  }
  return table[best];
}

export function OcheText({
  variant = 'bodyMd',
  color,
  allCaps = false,
  style,
  children,
  ...props
}: OcheTextProps) {
  const C = useTheme();
  const category: FontCategory = displayVariants.includes(variant)
    ? 'display'
    : monoVariants.includes(variant)
      ? 'mono'
      : 'body';

  const scale = FontSizes[variant] as any;

  // Labels are bold all-caps by spec; display defaults heavy; everything else 400.
  const weight = Number(
    scale?.weight ?? (variant.startsWith('label') ? 700 : category === 'display' ? 800 : 400)
  );

  const baseStyle: TextStyle = {
    fontFamily: pickFontFamily(category, weight),
    fontSize: scale?.size ?? 14,
    lineHeight: scale?.lineHeight ?? undefined,
    letterSpacing: scale?.tracking ?? undefined,
    // The family already carries the weight; keep RN from faux-bolding on top.
    fontWeight: 'normal',
    color: color ?? C.fg1,
    ...(allCaps ? { textTransform: 'uppercase' } : {}),
  };

  return (
    <Text style={[baseStyle, style]} {...props}>
      {children}
    </Text>
  );
}
