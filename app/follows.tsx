import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { PersonRow } from '@/components/PersonRow';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getFollowers, getFollowing } from '@/services/api';

type Tab = 'followers' | 'following';

export default function FollowsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = parseInt(params.id ?? '0', 10);
  const C = useTheme();
  const styles = makeStyles(C);
  const [tab, setTab] = useState<Tab>(params.tab === 'following' ? 'following' : 'followers');

  const { data, isLoading } = useQuery({
    queryKey: ['follows', id, tab],
    queryFn: () => (tab === 'followers' ? getFollowers(id) : getFollowing(id)),
    enabled: id > 0,
  });

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Réseau" left={back} />

      <View style={styles.tabs}>
        {(['followers', 'following'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <OcheText variant="labelMd" allCaps color={tab === t ? C.amber : C.fg3} style={styles.tabText}>
              {t === 'followers' ? 'Abonnés' : 'Abonnements'}
            </OcheText>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      ) : !data || data.length === 0 ? (
        <OcheText variant="bodyMd" color={C.fg3} style={styles.empty}>
          {tab === 'followers' ? 'Aucun abonné pour le moment.' : 'Aucun abonnement pour le moment.'}
        </OcheText>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {data.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: Spacing.s8 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.s3,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.amber },
  tabText: { letterSpacing: 1, fontWeight: '700' },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s10,
    gap: Spacing.s2,
  },
});
