import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { OcheText } from './OcheText';
import { Colors, Radii } from '@/constants/theme';

interface MonogramPortraitProps {
  name: string;
  size?: number;
  shape?: 'circle' | 'square';
  /** Photo de profil — affichée à la place du monogramme quand présente. */
  avatarUrl?: string | null;
  style?: ViewStyle;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getHue(name: string): string {
  const hues = [Colors.oak, Colors.bull, Colors.oakLight, Colors.walnutUp2];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return hues[Math.abs(hash) % hues.length];
}

export function MonogramPortrait({ name, size = 48, shape = 'square', avatarUrl, style }: MonogramPortraitProps) {
  const initials = getInitials(name);
  const bg = getHue(name);

  if (avatarUrl) {
    // Image accepte ImageStyle, pas le ViewStyle entrant → wrapper View.
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: shape === 'square' ? Radii.none : size / 2,
            borderWidth: 1,
            borderColor: Colors.border1,
            overflow: 'hidden',
            backgroundColor: bg,
          },
          style,
        ]}
      >
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: shape === 'square' ? Radii.none : size / 2,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <OcheText
        variant="displaySm"
        color={Colors.cream}
        style={{ fontSize: size * 0.38, lineHeight: size * 0.42 }}
      >
        {initials}
      </OcheText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border1,
  },
});
