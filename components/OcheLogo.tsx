import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Rect, G } from 'react-native-svg';
import { OcheText } from './OcheText';
import { Colors } from '@/constants/theme';

/**
 * Brand mark — a stylized dartboard (from design/assets/oche-mark.svg).
 * viewBox 0 0 200 200, scaled to `size`.
 */
export function OcheMark({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  // 8 chalk ticks around the board (from the source SVG).
  const ticks: [number, number, number, number][] = [
    [100, 24, 100, 40],
    [100, 160, 100, 176],
    [24, 100, 40, 100],
    [160, 100, 176, 100],
    [46, 46, 57, 57],
    [143, 143, 154, 154],
    [46, 154, 57, 143],
    [143, 57, 154, 46],
  ];

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G>
          <Circle cx={100} cy={100} r={92} fill={Colors.brick} />
          <Circle cx={100} cy={100} r={76} fill={Colors.parchment} />
          <G stroke={Colors.walnut} strokeWidth={2} fill="none">
            {ticks.map(([x1, y1, x2, y2], i) => (
              <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </G>
          <Circle cx={100} cy={100} r={42} fill={Colors.walnut} />
          <Circle cx={100} cy={100} r={22} fill={Colors.bull} />
          <Circle cx={100} cy={100} r={9} fill={Colors.amber} />
          <Rect x={20} y={190} width={160} height={6} fill={Colors.walnut} />
        </G>
      </Svg>
    </View>
  );
}

/** Wordmark — "HOCHE" in display type with the brand underline. */
export function OcheWordmark({
  color = Colors.amber,
  size = 28,
  style,
}: {
  color?: string;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wordmarkWrap, style]}>
      <OcheText
        variant="displaySm"
        allCaps
        color={color}
        style={{ fontSize: size, lineHeight: size * 1.02, letterSpacing: size * 0.18 }}
      >
        HOCHE
      </OcheText>
      <View style={[styles.underline, { backgroundColor: color, marginTop: size * 0.04 }]} />
    </View>
  );
}

/** Mark + wordmark, side by side — the primary lockup. */
export function OcheLogo({
  markSize = 36,
  wordSize = 26,
  color = Colors.amber,
  style,
}: {
  markSize?: number;
  wordSize?: number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.lockup, style]}>
      <OcheMark size={markSize} />
      <OcheWordmark color={color} size={wordSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkWrap: {
    alignItems: 'center',
  },
  underline: {
    height: 2,
    alignSelf: 'stretch',
  },
});
