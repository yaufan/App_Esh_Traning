import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { useAppStore } from '@/lib/store';
import { useTheme } from '@/theme';

type Icon = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: Icon; iconActive: Icon }[] = [
  { name: 'index', title: '首頁', icon: 'home-outline', iconActive: 'home' },
  { name: 'practice', title: '題庫', icon: 'layers-outline', iconActive: 'layers' },
  { name: 'review', title: '錯題本', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { name: 'laws', title: '法規', icon: 'library-outline', iconActive: 'library' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  const wrongCount = useAppStore((s) => Object.keys(s.wrong).length);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMute,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarBadge: t.name === 'review' && wrongCount > 0 ? wrongCount : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 11 },
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? t.iconActive : t.icon} size={size ?? 24} color={String(color)} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
