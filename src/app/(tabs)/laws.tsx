import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui/primitives';
import { groups, laws, meta } from '@/lib/bank';
import { radius, space, useTheme } from '@/theme';

export default function Laws() {
  const { colors } = useTheme();
  const [q, setQ] = useState('');

  const citeCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of groups) for (const it of g.items) for (const c of it.citations) m[c.pcode] = (m[c.pcode] ?? 0) + 1;
    return m;
  }, []);

  const list = laws
    .filter((l) => !q || l.name.includes(q.trim()))
    .sort((a, b) => (citeCount[b.pcode] ?? 0) - (citeCount[a.pcode] ?? 0));

  return (
    <Screen>
      <View style={{ paddingTop: space.md, gap: 4 }}>
        <AppText variant="display">法規</AppText>
        <AppText variant="small" color={colors.inkSoft}>
          題目引用的法規全文，取自全國法規資料庫（{meta.lawsRetrievedAt} 版本）。
        </AppText>
      </View>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Ionicons name="search" size={18} color={colors.inkMute} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="搜尋法規名稱"
          placeholderTextColor={colors.inkMute}
          style={{ flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 10 }}
        />
      </View>
      {list.map((l) => (
        <Card
          key={l.pcode}
          onPress={() => router.push({ pathname: '/law/[pcode]', params: { pcode: l.pcode } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="book-outline" size={20} color={colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong">{l.name}</AppText>
            <AppText variant="caption" color={colors.inkMute}>
              {l.modified}修正・{l.articles.length} 條
              {citeCount[l.pcode] ? `・被 ${citeCount[l.pcode]} 題引用` : ''}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMute} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
