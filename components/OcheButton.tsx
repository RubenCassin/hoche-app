import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, ViewStyle, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'primary' | 'amber' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface OcheButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const SIZES: Record<Size, { padH: number; padV: number; font: number }> = {
  sm: { padH: 14, padV: 9, font: 13 },
  md: { padH: 20, padV: 12, font: 15 },
  lg: { padH: 22, padV: 16, font: 17 },
};

export function OcheButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  style,
}: OcheButtonProps) {
  const C = useTheme();
  // Library `.btn`: display font, uppercase, square. On-accent text (onBrick/onAmber)
  // is fixed in both schemes since brick/amber surfaces never flip.
  const VARIANTS: Record<Variant, { bg: string; fg: string; border: string; pressed: string }> = {
    primary: { bg: C.brick, fg: C.onBrick, border: C.brick, pressed: C.brickPress },
    amber: { bg: C.amber, fg: C.onAmber, border: C.amber, pressed: C.amberPress },
    secondary: { bg: 'transparent', fg: C.cream, border: C.border1, pressed: C.walnutUp },
    ghost: { bg: 'transparent', fg: C.fg2, border: 'transparent', pressed: C.walnutUp },
  };
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const off = disabled || loading;

  const handle = () => {
    if (off) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handle}
      disabled={off}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled ? C.oak : pressed ? v.pressed : v.bg,
          borderColor: disabled ? C.oak : v.border,
          paddingHorizontal: s.padH,
          paddingVertical: s.padV,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={disabled ? C.fg3 : v.fg} />
      ) : (
        <OcheText
          variant="displayLg"
          allCaps
          color={disabled ? C.fg3 : v.fg}
          style={{ fontSize: s.font, lineHeight: s.font * 1.05, letterSpacing: s.font * 0.06 }}
        >
          {label}
        </OcheText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: Radii.none,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
});
