import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function GameLayout() {
  const C = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: C.walnut },
      }}
    />
  );
}
