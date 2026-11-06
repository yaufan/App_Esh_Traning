import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen, Tag } from '@/components/ui/primitives';
import { getGroup, getItem } from '@/lib/bank';
import { startGroups, startWrongReview } from '@/lib/start';
import { fmtDate } from '@/lib/stats';
import { useAppStore } from '@/lib/store';
import { typeLabel } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

export default function Review() {
  const { colors } = useTheme();
  const wrong = useAppStore((s) => s.wrong);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const removeWrong = useAppStore((s) => s.removeWrong);
  const toggle = useAppStore((s) => s.toggleBookmark);
  const [tab, setTab] = useState<'wrong' | 'star'>('wrong');

  const wrongList = Object.entries(wrong)
    .sort((a, b) => b[1] - a[1])
    .map(([id, at]) => ({ id, at, found: getItem(id) }))
    .filter((x) => x.found);
  const starList = Object.entries(bookmarks)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => getGroup(id))
    .filter(Boolean);

  return (
    <Screen>
      <View style={{ paddingTop: space.md }}>
        <AppText variant="display">錯題本</AppText>
        <AppText variant="small" color={colors.inkSoft}>
          答錯的子題會自動收進來；複習時答對就會移出。
        </AppText>
      </View>
      <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
        {(
          [
            ['wrong', `錯題 ${wrongList.length}`],
            ['star', `收藏題組 ${starList.length}`],
          ] as const
        ).map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <AppText variant="smallStrong" color={tab === k ? colors.ink : colors.inkSoft}>
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {tab === 'wrong' ? (
        wrongList.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" title="目前沒有錯題" body="做題時答錯的子題會出現在這裡。" />
        ) : (
          <>
            <Button
              title={`複習全部 ${wrongList.length} 題`}
              variant="accent"
              icon="refresh"
              onPress={() => startWrongReview(wrongList.map((w) => w.id))}
            />
            {wrongList.map(({ id, at, found }) => (
              <Card key={id} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Tag label={typeLabel[found!.item.type]} />
                  <AppText variant="caption" color={colors.inkMute} style={{ flex: 1 }} numberOfLines={1}>
                    {found!.group.title}
                  </AppText>
                  <AppText variant="caption" color={colors.inkMute}>
                    {fmtDate(at)}
                  </AppText>
                </View>
                <AppText variant="body" numberOfLines={3}>
                  {found!.item.stem.replace(/\{\{[^}]+\}\}/g, '＿＿')}
                </AppText>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button title="重做" compact icon="play" variant="outline" style={{ flex: 1 }} onPress={() => startWrongReview([id])} />
                  <Button title="移出" compact icon="trash-outline" variant="ghost" onPress={() => removeWrong(id)} />
                </View>
              </Card>
            ))}
          </>
        )
      ) : starList.length === 0 ? (
        <EmptyState icon="star-outline" title="還沒有收藏" body="在題庫列表點 ☆ 就能收藏題組。" />
      ) : (
        <>
          <Button
            title={`依序練習 ${starList.length} 個收藏題組`}
            variant="accent"
            icon="play"
            onPress={() => startGroups('收藏題組', starList.map((g) => g!.id))}
          />
          {starList.map((g) => (
            <Card key={g!.id} onPress={() => startGroups(g!.title, [g!.id])} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{g!.title}</AppText>
                <AppText variant="caption" color={colors.inkMute}>
                  {g!.topic}・{g!.items.length} 子題
                </AppText>
              </View>
              <Pressable hitSlop={10} onPress={() => toggle(g!.id)}>
                <Ionicons name="star" size={20} color={colors.accent} />
              </Pressable>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
});
