import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { StatRow } from '@/components/StatRow';
import { Sparkline } from '@/components/Sparkline';
import { BadgeGrid } from '@/components/BadgeGrid';
import { Spacing, Radii, Shadows } from '@/constants/theme';
import { flagEmoji } from '@/constants/flag';
import { useTheme, useThemeStore } from '@/hooks/useTheme';
import { useGameStore } from '@/hooks/useGameStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getStats, getFollowCounts } from '@/services/api';
import { detectAndSyncLocation } from '@/services/locationService';
import { queryClient } from '@/services/queryClient';
import { soundsEnabled, setSoundsEnabled } from '@/services/soundService';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { appMode, setAppMode } = useGameStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const guestMode = useAuthStore((s) => s.guestMode);
  const exitGuest = useAuthStore((s) => s.exitGuest);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const C = useTheme();
  const styles = makeStyles(C);

  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  const detectLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocMsg(null);
    const r = await detectAndSyncLocation();
    if (r.status === 'ok') {
      await refreshUser();
      // refresh the leaderboard so the new region/country shows up
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } else if (r.status === 'denied') {
      setLocMsg('Permission refusée — active la localisation dans les réglages.');
    } else {
      setLocMsg('Position introuvable, réessaie.');
    }
    setLocating(false);
  };
  const scheme = useThemeStore((s) => s.scheme);
  const setScheme = useThemeStore((s) => s.setScheme);

  const [sounds, setSounds] = useState(soundsEnabled());
  const toggleSounds = (v: boolean) => {
    setSounds(v);
    setSoundsEnabled(v);
  };

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => getStats(user!.id),
    enabled: !!user,
  });

  const { data: counts } = useQuery({
    queryKey: ['follow-counts', user?.id],
    queryFn: () => getFollowCounts(user!.id),
    enabled: !!user,
  });

  const sparkW = width - Spacing.s4 * 2 - Spacing.s4 * 2;
  const name = user?.name ?? 'Joueur';
  const losses = (stats?.legs_played ?? 0) - (stats?.legs_won ?? 0);
  const avgHistory = stats?.avg_history ?? [];

  if (guestMode) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <OcheHeader title="Profil" mode={appMode} bell={false} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.guestCard}>
            <OcheText variant="displaySm">🎯</OcheText>
            <OcheText variant="h2" color={C.cream}>Mode invité</OcheText>
            <OcheText variant="bodyMd" color={C.fg3} style={{ textAlign: 'center' }}>
              Tu joues en local, sans compte. Crée un compte pour tes stats, le classement Elo, les défis en ligne et sauvegarder ta progression.
            </OcheText>
            <OcheButton
              label="Créer un compte / Se connecter"
              onPress={() => exitGuest()}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: Spacing.s3 }}
            />
          </View>
          <View style={styles.tweakRow}>
            <OcheText variant="bodyMd" color={C.cream}>Thème</OcheText>
            <View style={styles.segControl}>
              {(['dark', 'light'] as const).map((m) => (
                <Pressable key={m} onPress={() => setScheme(m)} style={[styles.segBtn, scheme === m && styles.segBtnActive]}>
                  <OcheText variant="labelMd" allCaps color={scheme === m ? C.onAmber : C.fg2}>
                    {m === 'dark' ? 'Sombre' : 'Clair'}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.tweakRow}>
            <OcheText variant="bodyMd" color={C.cream}>Sons</OcheText>
            <View style={styles.segControl}>
              {([true, false] as const).map((v) => (
                <Pressable key={String(v)} onPress={() => toggleSounds(v)} style={[styles.segBtn, sounds === v && styles.segBtnActive]}>
                  <OcheText variant="labelMd" allCaps color={sounds === v ? C.onAmber : C.fg2}>
                    {v ? 'On' : 'Off'}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Profil" mode={appMode} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Fight card ── */}
        <View style={styles.fightCard}>
          <View style={styles.fightTop}>
            <OcheText variant="labelSm" allCaps color={C.amber} style={styles.fightEyebrow}>
              Oche Fight Card
            </OcheText>
            <OcheText variant="monoSm" color={C.fg3}>
              #{String(user?.id ?? 0).padStart(4, '0')}
            </OcheText>
          </View>

          <View style={styles.fightName}>
            <MonogramPortrait name={name} avatarUrl={user?.avatarUrl} size={64} shape="square" />
            <View style={styles.fightNameText}>
              <OcheText variant="displayMd" allCaps color={C.cream} style={styles.bigName} numberOfLines={1}>
                {name.split(' ')[0]}
              </OcheText>
              <OcheText variant="bodyMd" color={C.fg3}>{user?.username ?? ''}</OcheText>
              <View style={styles.countsRow}>
                <Pressable
                  onPress={() => user && router.push(`/follows?id=${user.id}&tab=followers`)}
                  hitSlop={6}
                >
                  <OcheText variant="bodyXS" color={C.fg2}>
                    <OcheText variant="bodyXS" color={C.cream}>{counts?.followers ?? 0}</OcheText> abonnés
                  </OcheText>
                </Pressable>
                <Pressable
                  onPress={() => user && router.push(`/follows?id=${user.id}&tab=following`)}
                  hitSlop={6}
                >
                  <OcheText variant="bodyXS" color={C.fg2}>
                    <OcheText variant="bodyXS" color={C.cream}>{counts?.following ?? 0}</OcheText> abonnements
                  </OcheText>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Mini stats trio */}
          <View style={styles.miniRow}>
            {[
              { l: 'Moyenne', v: stats ? String(stats.three_dart_avg || '—') : '—' },
              { l: 'Parties', v: String(stats?.matches_played ?? 0) },
              { l: 'Victoires', v: stats ? `${stats.win_pct}%` : '0%' },
            ].map((m, i) => (
              <View key={m.l} style={[styles.miniCell, i < 2 && styles.miniDivider]}>
                <OcheText variant="labelSm" allCaps color={C.fg3}>{m.l}</OcheText>
                <OcheText variant="h4" color={C.cream}>{m.v}</OcheText>
              </View>
            ))}
          </View>

          {/* W / L / 180 trio */}
          <View style={styles.recordRow}>
            <View style={styles.recordCell}>
              <OcheText variant="displayMd" color={C.win}>{stats?.legs_won ?? 0}</OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>W</OcheText>
            </View>
            <View style={styles.recordCell}>
              <OcheText variant="displayMd" color={C.loss}>{losses > 0 ? losses : 0}</OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>L</OcheText>
            </View>
            <View style={styles.recordCell}>
              <OcheText variant="displayMd" color={C.amber}>{stats?.total_180s ?? 0}</OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>180</OcheText>
            </View>
          </View>
        </View>

        {/* Match history entry */}
        <Pressable
          onPress={() => router.push('/history')}
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
        >
          <View>
            <OcheText variant="h4" color={C.cream}>Historique</OcheText>
            <OcheText variant="bodySm" color={C.fg3}>
              {stats ? `${stats.matches_played} partie${stats.matches_played > 1 ? 's' : ''} jouée${stats.matches_played > 1 ? 's' : ''}` : 'Tes parties passées'}
            </OcheText>
          </View>
          <OcheText variant="labelMd" allCaps color={C.amber}>Voir →</OcheText>
        </Pressable>

        {/* Form — recent X01 averages */}
        {avgHistory.length >= 2 && (
          <View style={styles.card}>
            <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.eyebrow}>
              Forme récente (X01)
            </OcheText>
            <Sparkline data={avgHistory} width={sparkW} height={48} color={C.amber} area />
          </View>
        )}

        {/* Detailed stats */}
        <View style={styles.card}>
          <OcheText variant="h5" allCaps color={C.fg2} style={styles.cardTitle}>
            Statistiques
          </OcheText>
          <StatRow label="3-dart avg" value={stats?.three_dart_avg ?? 0} highlight />
          <StatRow label="First-9 avg" value={stats?.first9_avg ?? 0} />
          <StatRow label="High checkout" value={stats?.highest_checkout ?? 0} highlight />
          <StatRow
            label="Checkout %"
            value={(stats?.checkout_attempts ?? 0) > 0 ? `${stats?.checkout_pct ?? 0}%` : '—'}
          />
          <StatRow label="Meilleure série" value={`${stats?.best_win_streak ?? 0} V`} />
          <StatRow label="Parties jouées" value={stats?.matches_played ?? 0} />
          <StatRow label="Legs gagnés" value={`${stats?.legs_won ?? 0} / ${stats?.legs_played ?? 0}`} />
          <StatRow label="Meilleure moyenne" value={stats?.best_game_avg ?? 0} />
        </View>

        {/* Achievements */}
        <BadgeGrid stats={stats} />

        {/* Location — drives the geo leaderboard */}
        <View style={styles.card}>
          <OcheText variant="h5" allCaps color={C.fg2} style={styles.cardTitle}>
            Position
          </OcheText>
          <View style={styles.locRow}>
            <OcheText variant="h1">{flagEmoji(user?.countryCode)}</OcheText>
            <View style={{ flex: 1 }}>
              <OcheText variant="bodyMd" color={C.cream}>
                {user?.country ?? 'Position non définie'}
              </OcheText>
              {!!(user?.city || user?.region) && (
                <OcheText variant="bodyXS" color={C.fg3}>
                  {[user?.city, user?.region].filter(Boolean).join(' · ')}
                </OcheText>
              )}
            </View>
            <OcheButton
              label={locating ? 'Localisation…' : user?.countryCode ? 'Mettre à jour' : 'Détecter'}
              onPress={detectLocation}
              loading={locating}
              variant="secondary"
              size="sm"
            />
          </View>
          {!!locMsg && <OcheText variant="bodyXS" color={C.loss}>{locMsg}</OcheText>}
          <OcheText variant="bodyXS" color={C.fg3}>
            Ta position GPS te classe dans ta région et en Europe (Online).
          </OcheText>
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <OcheText variant="h5" allCaps color={C.fg2} style={styles.cardTitle}>
            Préférences
          </OcheText>

          <View style={styles.tweakRow}>
            <OcheText variant="bodyMd" color={C.cream}>Mode</OcheText>
            <View style={styles.segControl}>
              {(['home', 'bar'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setAppMode(m)}
                  style={[styles.segBtn, appMode === m && styles.segBtnActive]}
                >
                  <OcheText variant="labelMd" allCaps color={appMode === m ? C.onAmber : C.fg2}>
                    {m === 'home' ? 'Maison' : 'Bar'}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.tweakRow}>
            <OcheText variant="bodyMd" color={C.cream}>Thème</OcheText>
            <View style={styles.segControl}>
              {(['dark', 'light'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setScheme(m)}
                  style={[styles.segBtn, scheme === m && styles.segBtnActive]}
                >
                  <OcheText variant="labelMd" allCaps color={scheme === m ? C.onAmber : C.fg2}>
                    {m === 'dark' ? 'Sombre' : 'Clair'}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.tweakRow, styles.tweakLast]}>
            <OcheText variant="bodyMd" color={C.cream}>Sons</OcheText>
            <View style={styles.segControl}>
              {([true, false] as const).map((v) => (
                <Pressable
                  key={String(v)}
                  onPress={() => toggleSounds(v)}
                  style={[styles.segBtn, sounds === v && styles.segBtnActive]}
                >
                  <OcheText variant="labelMd" allCaps color={sounds === v ? C.onAmber : C.fg2}>
                    {v ? 'On' : 'Off'}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Compte */}
        <OcheButton
          label="Modifier le profil"
          onPress={() => router.push('/edit-profile')}
          variant="secondary"
          size="md"
          fullWidth
          style={{ marginTop: Spacing.s2 }}
        />
        <OcheButton
          label="Joueurs bloqués"
          onPress={() => router.push('/blocked')}
          variant="ghost"
          size="md"
          fullWidth
        />
        <OcheButton label="Se déconnecter" onPress={logout} variant="secondary" size="md" fullWidth />
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  guestCard: {
    backgroundColor: C.walnutUp2,
    borderWidth: 1,
    borderColor: C.amber,
    borderRadius: Radii.lg,
    padding: Spacing.s5,
    alignItems: 'center',
    gap: Spacing.s2,
    ...Shadows.glowAmber,
  },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s10,
    gap: Spacing.s3,
  },
  fightCard: {
    backgroundColor: C.walnutUp2,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.amber,
    padding: Spacing.s5,
    gap: Spacing.s4,
    ...Shadows.glowAmber,
  },
  fightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fightEyebrow: { letterSpacing: 1.5 },
  fightName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s4,
  },
  fightNameText: { flex: 1, gap: 2 },
  countsRow: { flexDirection: 'row', gap: Spacing.s4, marginTop: 2 },
  bigName: { letterSpacing: -0.5 },
  miniRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.border1,
    borderBottomWidth: 1,
    borderBottomColor: C.border1,
    paddingVertical: Spacing.s3,
  },
  miniCell: {
    flex: 1,
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s2,
  },
  miniDivider: { borderRightWidth: 1, borderRightColor: C.border1 },
  recordRow: { flexDirection: 'row' },
  recordCell: { flex: 1, alignItems: 'center', gap: 2 },
  card: {
    backgroundColor: C.walnutUp,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s4,
    gap: Spacing.s2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.walnutUp,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s4,
  },
  eyebrow: { letterSpacing: 1.5 },
  cardTitle: { letterSpacing: 1, marginBottom: Spacing.s1 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
  tweakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: C.border2,
  },
  tweakLast: { borderBottomWidth: 0 },
  segControl: {
    flexDirection: 'row',
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: C.border1,
    overflow: 'hidden',
  },
  segBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  segBtnActive: { backgroundColor: C.amber },
});
