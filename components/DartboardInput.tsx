import React, { useCallback, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DartModifier } from './DartPad';

interface DartboardInputProps {
  onScore: (points: number, modifier: DartModifier, segment: number) => void;
  onUndo?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

// Standard dartboard number order, clockwise starting at the top (12 o'clock).
const WEDGES = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Ring radii as a fraction of the board radius R (double-outer edge = 1.0).
// Slightly fattened triple/double bands vs. a real board for tap-ability.
const R_BULLSEYE = 0.07; // 50
const R_BULL = 0.15; //     25
const R_TRIPLE_IN = 0.45;
const R_TRIPLE_OUT = 0.58;
const R_DOUBLE_IN = 0.85;
// double-outer = 1.0

const SECTOR = 18; // degrees per wedge

/** Polar → cartesian, angle in degrees measured clockwise from the top. */
function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

/** SVG path for an annular sector between rIn..rOut, a0..a1 (deg, clockwise-from-top). */
function annularSector(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  a0: number,
  a1: number
): string {
  const [x0o, y0o] = polar(cx, cy, rOut, a0);
  const [x1o, y1o] = polar(cx, cy, rOut, a1);
  const [x1i, y1i] = polar(cx, cy, rIn, a1);
  const [x0i, y0i] = polar(cx, cy, rIn, a0);
  return [
    `M ${x0o} ${y0o}`,
    `A ${rOut} ${rOut} 0 0 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${rIn} ${rIn} 0 0 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ');
}

export function DartboardInput({ onScore, onUndo, disabled = false, style }: DartboardInputProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const { width } = useWindowDimensions();
  // Measure the slot we're given so the board (+ undo) always fits the input
  // area above the tab bar, however tall the scoreboard above us is.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  const undoReserve = onUndo ? 60 : 0;
  const availW = box.w || width - Spacing.s4 * 2;
  const availH = (box.h || 320) - undoReserve - Spacing.s2 * 2;
  const size = Math.max(180, Math.min(availW, availH, 340));
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 18; // leave room for the number labels

  const handleTouch = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) return;
      const { locationX, locationY } = e.nativeEvent;
      const dx = locationX - cx;
      const dy = locationY - cy;
      const dist = Math.hypot(dx, dy);
      const frac = dist / R;

      // Outside the board → miss.
      if (frac > 1.0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onScore(0, 'S', 0);
        return;
      }

      // Bull / bullseye.
      if (frac <= R_BULLSEYE) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onScore(50, 'D', 25);
        return;
      }
      if (frac <= R_BULL) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onScore(25, 'S', 25);
        return;
      }

      // Wedge from angle (clockwise from top).
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, 90 = down
      let fromTop = (angle + 90 + 360) % 360;
      const idx = Math.round(fromTop / SECTOR) % WEDGES.length;
      const segment = WEDGES[idx];

      // Ring → modifier.
      let modifier: DartModifier = 'S';
      if (frac >= R_TRIPLE_IN && frac < R_TRIPLE_OUT) modifier = 'T';
      else if (frac >= R_DOUBLE_IN) modifier = 'D';

      const mult = modifier === 'T' ? 3 : modifier === 'D' ? 2 : 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onScore(segment * mult, modifier, segment);
    },
    [cx, cy, R, disabled, onScore]
  );

  // Build the visual wedges.
  const wedges = WEDGES.map((seg, i) => {
    const a0 = i * SECTOR - SECTOR / 2;
    const a1 = i * SECTOR + SECTOR / 2;
    const light = i % 2 === 0;
    const singleFill = light ? C.cream : C.walnut;
    const ringFill = light ? C.brick : C.win;

    const rBull = R_BULL * R;
    const rTin = R_TRIPLE_IN * R;
    const rTout = R_TRIPLE_OUT * R;
    const rDin = R_DOUBLE_IN * R;
    const rDout = R;

    const [lx, ly] = polar(cx, cy, R + 9, i * SECTOR);

    return (
      <G key={seg}>
        {/* inner single */}
        <Path d={annularSector(cx, cy, rBull, rTin, a0, a1)} fill={singleFill} />
        {/* triple ring */}
        <Path d={annularSector(cx, cy, rTin, rTout, a0, a1)} fill={ringFill} />
        {/* outer single */}
        <Path d={annularSector(cx, cy, rTout, rDin, a0, a1)} fill={singleFill} />
        {/* double ring */}
        <Path d={annularSector(cx, cy, rDin, rDout, a0, a1)} fill={ringFill} />
        {/* number label */}
        <SvgText
          x={lx}
          y={ly + 4}
          fill={C.fg2}
          fontSize={12}
          fontWeight="700"
          textAnchor="middle"
        >
          {seg}
        </SvgText>
      </G>
    );
  });

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <View
        style={{ width: size, height: size }}
        onStartShouldSetResponder={() => !disabled}
        onResponderRelease={handleTouch}
      >
        <Svg width={size} height={size} pointerEvents="none">
          {wedges}
          {/* bull 25 */}
          <Circle cx={cx} cy={cy} r={R_BULL * R} fill={C.win} />
          {/* bullseye 50 */}
          <Circle cx={cx} cy={cy} r={R_BULLSEYE * R} fill={C.bull} />
        </Svg>
      </View>

      {onUndo && (
        <Pressable
          onPress={() => {
            if (disabled) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onUndo();
          }}
          style={({ pressed }) => [styles.undo, pressed && styles.undoPressed]}
        >
          <OcheText variant="labelMd" allCaps color={C.fg2}>Annuler la fléchette</OcheText>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.s2,
    gap: Spacing.s3,
  },
  undo: {
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s6,
    backgroundColor: C.walnutUp,
  },
  undoPressed: {
    backgroundColor: C.oak,
  },
});
