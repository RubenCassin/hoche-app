import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheText } from './OcheText';
import { OcheLogo } from './OcheLogo';
import { NotificationBell } from './NotificationBell';
import { HEADER_HEIGHT, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface OcheHeaderProps {
  title?: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  mode?: 'bar' | 'home';
  /** Show the notification bell on the right (default true). */
  bell?: boolean;
  style?: ViewStyle;
}

export function OcheHeader({ title, subtitle, left, right, mode = 'home', bell = true, style }: OcheHeaderProps) {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <View style={styles.inner}>
        <View style={styles.side}>{left}</View>
        <View style={styles.center}>
          {title ? (
            <>
              <OcheText variant="displaySm" allCaps style={styles.title}>
                {title}
              </OcheText>
              {subtitle && (
                <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.subtitle}>
                  {subtitle}
                </OcheText>
              )}
            </>
          ) : (
            <OcheLogo markSize={30} wordSize={24} />
          )}
        </View>
        <View style={[styles.side, styles.sideRight]}>
          {right}
          {mode === 'bar' && (
            <View style={styles.modeBadge}>
              <OcheText variant="labelSm" allCaps color={C.onAmber} style={styles.modeBadgeText}>
                Bar
              </OcheText>
            </View>
          )}
          {bell && <NotificationBell />}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    backgroundColor: C.walnut,
    borderBottomWidth: 1,
    borderBottomColor: C.border1,
  },
  inner: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s4,
  },
  side: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: C.cream,
    letterSpacing: 2,
  },
  subtitle: {
    letterSpacing: 1,
    marginTop: -2,
  },
  wordmark: {
    color: C.amber,
    letterSpacing: 6,
  },
  modeBadge: {
    backgroundColor: C.amber,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  modeBadgeText: {
    fontWeight: '700',
    letterSpacing: 1,
  },
});
