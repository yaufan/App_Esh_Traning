import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { getArticle } from '@/lib/bank';
import type { Citation } from '@/lib/types';
import { radius, space, type, useTheme } from '@/theme';

function norm(s: string) {
  return s.replace(/\s+/g, '');
}

/** 在條文中標出引用的那段原文 */
function highlight(text: string, quote: string) {
  const q = norm(quote);
  // 建立「去空白後位置 → 原文位置」的對照
  const map: number[] = [];
  let compact = '';
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) {
      map.push(i);
      compact += text[i];
    }
  }
  const at = compact.indexOf(q);
  if (at < 0) return null;
  const start = map[at];
  const end = map[at + q.length - 1] + 1;
  return [text.slice(0, start), text.slice(start, end), text.slice(end)] as const;
}

export function CitationCard({ c, expanded = false }: { c: Citation; expanded?: boolean }) {
  const { colors } = useTheme();
  const found = getArticle(c.pcode, c.article);
  const lawName = found?.law.name ?? c.pcode;
  const isTable = c.article.startsWith('附表');
  const label = isTable ? c.article : `第 ${c.article} 條`;
  const parts = found ? highlight(found.article.text, c.quote) : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/law/[pcode]', params: { pcode: c.pcode, a: c.article } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.rail, { backgroundColor: colors.accent }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.head}>
          <Ionicons name="document-text-outline" size={15} color={colors.inkSoft} />
          <AppText variant="smallStrong" style={{ flex: 1 }}>
            {lawName}　<AppText variant="smallStrong" mono>{label}</AppText>
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.inkMute} />
        </View>
        {expanded && parts ? (
          <Text style={[type.small, { color: colors.inkSoft }]}>
            {parts[0].slice(-60).length < parts[0].length ? '…' : ''}
            {parts[0].slice(-60)}
            <Text style={{ backgroundColor: colors.accentSoft, color: colors.ink, fontWeight: '700' }}>{parts[1]}</Text>
            {parts[2].slice(0, 60)}
            {parts[2].length > 60 ? '…' : ''}
          </Text>
        ) : (
          <Text style={[type.small, { color: colors.ink }]}>
            <Text style={{ color: colors.inkMute }}>「</Text>
            {c.quote}
            <Text style={{ color: colors.inkMute }}>」</Text>
          </Text>
        )}
        {found && (
          <AppText variant="caption" color={colors.inkMute}>
            版本：{found.law.modified}修正・全國法規資料庫
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    overflow: 'hidden',
  },
  rail: { width: 3, borderRadius: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
