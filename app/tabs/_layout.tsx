import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Ellipse } from 'react-native-svg';
import { TAB_BAR_HEIGHT } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { OcheText } from '@/components/OcheText';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function TargetIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.75} />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={1.75} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.75} />
      <Ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth={1.75} />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function FeedIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h3l2-5 3 11 3-8 2 2h5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChartIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20l4-6 4 3 4-8 4 5" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.75} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Tab item (icon + label) ─────────────────────────────────────────────────

function TabItem({
  Icon,
  label,
  focused,
}: {
  Icon: (p: { color: string }) => React.ReactElement;
  label: string;
  focused: boolean;
}) {
  const C = useTheme();
  const styles = makeStyles(C);
  const color = focused ? C.orange : C.fg3;
  return (
    <View style={styles.tabItem}>
      <Icon color={color} />
      <OcheText variant="labelSm" color={color} style={styles.label}>
        {label}
      </OcheText>
    </View>
  );
}

export default function TabsLayout() {
  const C = useTheme();
  const styles = makeStyles(C);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.brick,
        tabBarInactiveTintColor: C.fg3,
        sceneStyle: { backgroundColor: C.walnut },
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabItem Icon={TargetIcon} label="Jouer" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="online"
        options={{
          tabBarIcon: ({ focused }) => <TabItem Icon={GlobeIcon} label="Online" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => <TabItem Icon={FeedIcon} label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => <TabItem Icon={ChartIcon} label="Stats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabItem Icon={UserIcon} label="Profil" focused={focused} />,
        }}
      />
      {/* Scoring is launched from Home / Nouvelle — reachable but not a tab. */}
      <Tabs.Screen name="scoring" options={{ href: null }} />
    </Tabs>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  tabBar: {
    backgroundColor: C.walnut,
    borderTopWidth: 1,
    borderTopColor: C.border1,
    height: TAB_BAR_HEIGHT,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    width: 64,
    paddingTop: 2,
  },
  label: {
    letterSpacing: 0.5,
  },
});
