import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getBlockedUsers, unblockUser } from '@/services/api';
import { queryClient } from '@/services/queryClient';

export default function BlockedScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);

  const { data, isLoading } = useQuery({ queryKey: ['blocked'], queryFn: getBlockedUsers });

  const unblock = async (id: number) => {
    await unblockUser(id).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['blocked'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['user-profile', id] });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader
        title="Joueurs bloqués"
        bell={false}
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
        ) : !data || data.length === 0 ? (
          <View style={styles.center}>
            <OcheText variant="bodyMd" color={C.fg3} style={{ textAlign: 'center' }}>
              Personne dans le placard. Tu peux bloquer un joueur depuis son profil — il disparaîtra de ta recherche, de ton feed et ne pourra plus te défier.
            </OcheText>
          </View>
        ) : (
          data.map((u) => (
            <View key={u.id} style={styles.row}>
              <MonogramPortrait name={u.name} avatarUrl={u.avatarUrl} size={44} shape="square" />
              <View style={{ flex: 1 }}>
                <OcheText variant="bodyMd" color={C.cream} numberOfLines={1}>{u.name}</OcheText>
                <OcheText variant="bodyXS" color={C.fg3}>{u.username}</OcheText>
              </View>
              <OcheButton label="Débloquer" onPress={() => unblock(u.id)} variant="secondary" size="sm" />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  scroll: { padding: Spacing.s4, gap: Spacing.s2 },
  center: { paddingTop: Spacing.s8, paddingHorizontal: Spacing.s4, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    padding: Spacing.s3,
  },
});
