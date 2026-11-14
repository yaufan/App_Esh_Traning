import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen, SectionTitle, Tag } from '@/components/ui/primitives';
import { getGroup, getItem, plainStem, type ItemRef } from '@/lib/bank';
import { startGroups, startStudy, startWrongReview } from '@/lib/start';
import { useNow } from '@/lib/stats';
import { isDue, SRS_INTERVALS, startOfDay, useAppStore } from '@/lib/store';
import { typeLabel } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

type Tab = 'wrong' | 'star' | 'note';

/** 距離到期日還有幾天的白話說法 */
function dueLabel(due: number, now: number) {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
  if (days <= 0) return '今天複習';
  if (days === 1) return '明天複習';
  return `${days} 天後複習`;
}

function StageDots({ stage }: { stage: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`已通過 ${stage} / ${SRS_INTERVALS.length} 次複習`}>
      {SRS_INTERVALS.map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < stage ? colors.success : colors.line }]} />
      ))}
    </View>
  );
}

function WrongCard({ id, found, due, stage, isDueNow, now }: { id: string; found: ItemRef; due: number; stage: number; isDueNow: boolean; now: number }) {
  const { colors } = useTheme();
  const removeWrong = useAppStore((s) => s.removeWrong);
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Tag label={typeLabel[found.item.type]} />
        <AppText variant="caption" color={colors.inkMute} style={{ flex: 1 }} numberOfLines={1}>
          {found.group.title}
        </AppText>
        <StageDots stage={stage} />
        <AppText variant="caption" color={isDueNow ? colors.danger : colors.inkMute}>
          {dueLabel(due, now)}
        </AppText>
      </View>
      <AppText variant="body" numberOfLines={3}>
        {plainStem(found.item.stem)}
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          title={isDueNow ? '複習' : '提前練習'}
          compact
          icon="play"
          variant={isDueNow ? 'primary' : 'outline'}
          style={{ flex: 1 }}
          onPress={() => startWrongReview([id])}
        />
        <Button title="移出" compact icon="trash-outline" variant="ghost" onPress={() => removeWrong(id)} />
      </View>
    </Card>
  );
}

export default function Review() {
  const { colors } = useTheme();
  const wrong = useAppStore((s) => s.wrong);
  const srs = useAppStore((s) => s.srs);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const notes = useAppStore((s) => s.notes);
  const toggle = useAppStore((s) => s.toggleBookmark);
  const [tab, setTab] = useState<Tab>('wrong');

  const now = useNow();
  const wrongList = Object.keys(wrong)
    .map((id) => ({ id, found: getItem(id), due: srs[id]?.due ?? 0, stage: srs[id]?.stage ?? 0 }))
    .filter((x): x is { id: string; found: ItemRef; due: number; stage: number } => !!x.found)
    .sort((a, b) => a.due - b.due);
  const dueList = wrongList.filter((w) => isDue(srs, w.id, now));
  const laterList = wrongList.filter((w) => !isDue(srs, w.id, now));
  const starList = Object.entries(bookmarks)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => getGroup(id))
    .filter(Boolean);
  const noteList = Object.entries(notes)
    .map(([id, text]) => ({ id, text, found: getItem(id) }))
    .filter((x): x is { id: string; text: string; found: ItemRef } => !!x.found);

  return (
    <Screen>
      <View style={{ paddingTop: space.md }}>
        <AppText variant="display">錯題本</AppText>
        <AppText variant="small" color={colors.inkSoft}>
          答錯的子題會排進複習：隔 {SRS_INTERVALS.join('、')} 天各考一次，每次到期答對就進下一關，{SRS_INTERVALS.length} 關都過才移出。
        </AppText>
      </View>
      <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
        {(
          [
            ['wrong', `錯題 ${wrongList.length}`],
            ['star', `收藏 ${starList.length}`],
            ['note', `筆記 ${noteList.length}`],
          ] as const
        ).map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <AppText variant="smallStrong" color={tab === k ? colors.ink : colors.inkSoft}>
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {tab === 'wrong' &&
        (wrongList.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" title="目前沒有錯題" body="做題時答錯的子題會出現在這裡，並自動排好複習日。" />
        ) : (
          <>
            {dueList.length > 0 ? (
              <Button title={`複習今天到期的 ${dueList.length} 題`} variant="accent" icon="refresh" onPress={() => startWrongReview(dueList.map((w) => w.id))} />
            ) : (
              <Card tone="alt" style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <AppText variant="small" style={{ flex: 1 }}>
                  今天到期的都複習完了。下面的題目還沒到複習日，想提前練也可以，但要到期那天答對才算過關。
                </AppText>
              </Card>
            )}
            {dueList.length > 0 && <SectionTitle title={`今天到期 ${dueList.length}`} />}
            {dueList.map((w) => (
              <WrongCard key={w.id} {...w} isDueNow now={now} />
            ))}
            {laterList.length > 0 && <SectionTitle title={`之後複習 ${laterList.length}`} />}
            {laterList.map((w) => (
              <WrongCard key={w.id} {...w} isDueNow={false} now={now} />
            ))}
          </>
        ))}

      {tab === 'star' &&
        (starList.length === 0 ? (
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
                <Pressable hitSlop={10} onPress={() => toggle(g!.id)} accessibilityLabel="取消收藏">
                  <Ionicons name="star" size={20} color={colors.accent} />
                </Pressable>
              </Card>
            ))}
          </>
        ))}

      {tab === 'note' &&
        (noteList.length === 0 ? (
          <EmptyState icon="pencil-outline" title="還沒有筆記" body="在任何一題的解析下方點「寫筆記」，就會收在這裡。" />
        ) : (
          noteList.map(({ id, text, found }) => (
            <Card key={id} onPress={() => startStudy(found.group.title, [found.group.id])} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Tag label={typeLabel[found.item.type]} />
                <AppText variant="caption" color={colors.inkMute} style={{ flex: 1 }} numberOfLines={1}>
                  {found.group.title}
                </AppText>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMute} />
              </View>
              <AppText variant="small" color={colors.inkSoft} numberOfLines={2}>
                {plainStem(found.item.stem)}
              </AppText>
              <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
                <AppText variant="body">{text}</AppText>
              </View>
            </Card>
          ))
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  note: { borderRadius: radius.md, padding: space.md },
});
