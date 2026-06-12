import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { OcheButton } from './OcheButton';
import { MonogramPortrait } from './MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { followUser, unfollowUser, type PersonResult } from '@/services/api';
import { queryClient } from '@/services/queryClient';

interface PersonRowProps {
  person: PersonResult;
  onChanged?: () => void;
}

/** A tappable user row (→ their profile) with a follow / unfollow button. */
export function PersonRow({ person, onChanged }: PersonRowProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const [following, setFollowing] = useState(person.isFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    Haptics.selectionAsync();
    const next = !following;
    setFollowing(next);
    try {
      if (next) await followUser(person.id);
      else await unfollowUser(person.id);
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      onChanged?.();
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/user/${person.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <MonogramPortrait name={person.name} size={36} />
      <View style={styles.info}>
        <OcheText variant="h5" color={C.cream} numberOfLines={1}>{person.name}</OcheText>
        <OcheText variant="bodyXS" color={C.fg3}>{person.username}</OcheText>
      </View>
      {!person.isSelf && (
        <OcheButton
          label={following ? (person.mutual ? 'Amis' : 'Suivi') : 'Suivre'}
          onPress={toggle}
          variant={following ? 'secondary' : 'amber'}
          size="sm"
        />
      )}
    </Pressable>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s3,
  },
  info: { flex: 1, gap: 1 },
});
