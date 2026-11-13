import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, ProgressBar, Screen, Tag } from '@/components/ui/primitives';
import { officialSessions, topicsOf } from '@/lib/bank';
import { startOfficial, startOfficialStudy, startPractice, startStudy } from '@/lib/start';
import { useAppStore } from '@/lib/store';
import type { Group } from '@/lib/types';
import { categoryMeta, radius, space, useTheme } from '@/theme';

function Segmented({ value, onChange }: { value: 'self' | 'official'; onChange: (v: 'self' | 'official') => void }) {
  const { colors } = useTheme();
  const opts: { v: 'self' | 'official'; label: string }[] = [
    { v: 'self', label: '電腦化題組' },
    { v: 'official', label: '官方舊題 105–109' },
  ];
  return (
    <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
      {opts.map((o) => (
        <Pressable
          key={o.v}
          onPress={() => onChange(o.v)}
          style={[styles.segBtn, value === o.v && { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="smallStrong" color={value === o.v ? colors.ink : colors.inkSoft}>
            {o.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** 題庫頁的讀題方式：自己作答，或直接看答案與解析 */
function ModeSwitch() {
  const { colors } = useTheme();
  const study = useAppStore((s) => !!s.settings.studyMode);
  const setSetting = useAppStore((s) => s.setSetting);
  const opts: { v: boolean; label: string; icon: 'create-outline' | 'eye-outline' }[] = [
    { v: false, label: '自己作答', icon: 'create-outline' },
    { v: true, label: '直接看答案', icon: 'eye-outline' },
  ];
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
        {opts.map((o) => {
          const active = study === o.v;
          return (
            <Pressable
              key={o.label}
              onPress={() => setSetting('studyMode', o.v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.segBtn, styles.modeBtn, active && { backgroundColor: o.v ? colors.successSoft : colors.surface, borderColor: o.v ? colors.success : colors.line }]}>
              <Ionicons name={o.icon} size={16} color={active ? (o.v ? colors.success : colors.ink) : colors.inkSoft} />
              <AppText variant="smallStrong" color={active ? (o.v ? colors.success : colors.ink) : colors.inkSoft}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {study && (
        <AppText variant="caption" color={colors.inkSoft}>
          點任何題組都會直接顯示正確答案、解析與法規依據，不用作答，也不列入答對率和錯題本。
        </AppText>
      )}
    </View>
  );
}

function GroupRow({ g }: { g: Group }) {
  const { colors } = useTheme();
  const study = useAppStore((s) => !!s.settings.studyMode);
  const stats = useAppStore((s) => s.itemStats);
  const bookmarked = useAppStore((s) => !!s.bookmarks[g.id]);
  const toggle = useAppStore((s) => s.toggleBookmark);
  const done = g.items.filter((i) => stats[i.id]).length;
  const ok = g.items.filter((i) => stats[i.id]?.last).length;
  const sub = g.topic.split('｜')[1];
  return (
    <Pressable
      onPress={() => (study ? startStudy : startPractice)(g.title, [g.id])}
      accessibilityLabel={`${g.title}・${study ? '直接看答案' : '開始練習'}`}
      style={({ pressed }) => [styles.groupRow, { borderTopColor: colors.line, opacity: pressed ? 0.75 : 1 }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="bodyStrong">{g.title}</AppText>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {sub ? (
            <AppText variant="caption" color={colors.inkMute}>
              {sub}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.inkMute}>
            ・{g.items.length} 子題
          </AppText>
          {done > 0 && (
            <AppText variant="caption" color={ok === g.items.length ? colors.success : colors.inkSoft}>
              ・答對 {ok}/{g.items.length}
            </AppText>
          )}
        </View>
      </View>
      <Pressable hitSlop={10} onPress={() => toggle(g.id)} accessibilityLabel="收藏題組">
        <Ionicons name={bookmarked ? 'star' : 'star-outline'} size={20} color={bookmarked ? colors.accent : colors.inkMute} />
      </Pressable>
      <Ionicons name={study ? 'eye' : 'play-circle'} size={study ? 26 : 28} color={study ? colors.success : colors.ink} />
    </Pressable>
  );
}

function TopicCard({ category, topic, groups }: { category: 1 | 2 | 3; topic: string; groups: Group[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const study = useAppStore((s) => !!s.settings.studyMode);
  const stats = useAppStore((s) => s.itemStats);
  const ids = groups.flatMap((g) => g.items.map((i) => i.id));
  const done = ids.filter((id) => stats[id]).length;
  const tint = colors[categoryMeta[category].key];
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.topicHead}>
        <View style={[styles.topicBar, { backgroundColor: tint }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="bodyStrong">{topic}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <AppText variant="caption" color={colors.inkSoft}>
              {groups.length} 題組・{ids.length} 子題
            </AppText>
            <View style={{ flex: 1 }}>
              <ProgressBar value={ids.length ? done / ids.length : 0} color={tint} height={5} />
            </View>
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkSoft} />
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
          {groups.map((g) => (
            <GroupRow key={g.id} g={g} />
          ))}
          <Button
            title={study ? `整個主題直接看答案（${groups.length} 題組）` : `整個主題依序練習（${groups.length} 題組）`}
            compact
            variant="outline"
            icon={study ? 'eye-outline' : 'list'}
            style={{ marginTop: space.sm }}
            onPress={() => (study ? startStudy : startPractice)(topic, groups.map((g) => g.id))}
          />
        </View>
      )}
    </Card>
  );
}

function SelfBank() {
  const { colors } = useTheme();
  const study = useAppStore((s) => !!s.settings.studyMode);
  const [cat, setCat] = useState<1 | 2 | 3>(1);
  const topics = topicsOf(cat);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {([1, 2, 3] as const).map((c) => {
          const m = categoryMeta[c];
          const active = c === cat;
          const tint = colors[m.key];
          return (
            <Pressable
              key={c}
              onPress={() => setCat(c)}
              style={[
                styles.catChip,
                { borderColor: active ? tint : colors.line, backgroundColor: active ? tint : colors.surface },
              ]}>
              <AppText variant="caption" color={active ? '#fff' : colors.inkSoft}>
                第{['一', '二', '三'][c - 1]}類
              </AppText>
              <AppText variant="smallStrong" color={active ? '#fff' : colors.ink} numberOfLines={1}>
                {m.short}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="small" color={colors.inkSoft}>
        {categoryMeta[cat].name}・點主題展開題組，{study ? '點題組直接看答案與解析（不計分）' : '點 ▶ 開始練習（作答後可立即看解析）'}
      </AppText>
      {topics.length === 0 ? (
        <EmptyState icon="construct-outline" title="這一類還沒有題組" />
      ) : (
        topics.map((t) => <TopicCard key={t.topic} category={cat} topic={t.topic} groups={t.groups} />)
      )}
    </View>
  );
}

function OfficialBank() {
  const { colors } = useTheme();
  const sessions = officialSessions();
  const study = useAppStore((s) => !!s.settings.studyMode);
  const stats = useAppStore((s) => s.itemStats);
  return (
    <View style={{ gap: space.md }}>
      <Card tone="accent" style={{ gap: 6 }}>
        <AppText variant="smallStrong">關於官方舊題</AppText>
        <AppText variant="small" color={colors.inkSoft}>
          105–109 年術科為紙筆問答，題目照錄官方試卷；參考答案是本 APP 依「現行」法規重新撰寫，與當年法規不同處會特別標註。110 年起改為電腦化測試，官方不再公開試題。
        </AppText>
      </Card>
      {sessions.length === 0 && <EmptyState icon="document-outline" title="尚未收錄官方舊題" />}
      {sessions.map((s) => {
        const ids = s.groups.flatMap((g) => g.items.map((i) => i.id));
        const done = ids.filter((id) => stats[id]).length;
        const [y, b] = s.session.split('-');
        return (
          <Card key={s.session} onPress={() => (study ? startOfficialStudy : startOfficial)(s.session)} style={styles.sessionCard}>
            <View style={[styles.sessionBadge, { backgroundColor: colors.hero }]}>
              <AppText variant="heading" mono color={colors.accent}>
                {y}
              </AppText>
              <AppText variant="caption" color={colors.heroInk}>
                第 {b} 梯次
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="bodyStrong">{y} 年度第 {b} 梯次 術科</AppText>
              <AppText variant="caption" color={colors.inkSoft} numberOfLines={2}>
                {s.groups.map((g) => g.title).slice(0, 3).join('、')}…
              </AppText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Tag label={`${s.groups.length} 題`} />
                {done > 0 && <Tag label={`已看 ${done}/${ids.length}`} color={colors.success} bg={colors.successSoft} />}
              </View>
            </View>
            <Ionicons name={study ? 'eye' : 'chevron-forward'} size={20} color={study ? colors.success : colors.inkMute} />
          </Card>
        );
      })}
    </View>
  );
}

export default function Practice() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'self' | 'official'>(params.tab === 'official' ? 'official' : 'self');
  const [prevParam, setPrevParam] = useState(params.tab);
  if (params.tab !== prevParam) {
    setPrevParam(params.tab);
    if (params.tab === 'official') setTab('official');
  }
  return (
    <Screen>
      <View style={{ paddingTop: space.md }}>
        <AppText variant="display">題庫</AppText>
      </View>
      <Segmented value={tab} onChange={setTab} />
      <ModeSwitch />
      {tab === 'self' ? <SelfBank /> : <OfficialBank />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeBtn: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  catChip: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  topicHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingLeft: 0 },
  topicBar: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sessionBadge: { width: 68, height: 68, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
