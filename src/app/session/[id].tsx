import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuestionCard } from '@/components/question/renderer';
import { CalculatorSheet } from '@/components/ui/calculator';
import { AppText, Button, Card, HazardStripe, IconButton, Tag, useHaptic } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { getGroup } from '@/lib/bank';
import { isAnswered } from '@/lib/grading';
import { startPractice } from '@/lib/start';
import { fmtClock, remainingSec } from '@/lib/stats';
import { useAppStore } from '@/lib/store';
import type { Group, Item } from '@/lib/types';
import { categoryMeta, MAX_WIDTH, radius, space, useTheme } from '@/theme';

/** 官方舊題：取出第一個小題「(一)」之前的題目說明；沒有小題時整題就是子題題幹，不另顯示 */
function officialLead(g: Group): string | null {
  const t = g.originalText?.trim();
  if (!t) return null;
  const m = t.search(/[(（]一[)）]/);
  if (m <= 0) return null;
  const lead = t.slice(0, m).trim();
  return lead.length >= 4 ? lead : null;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
  const s = useAppStore((st) => st.sessions[id]);
  const setAnswer = useAppStore((st) => st.setAnswer);
  const setIndex = useAppStore((st) => st.setIndex);
  const reveal = useAppStore((st) => st.reveal);
  const submit = useAppStore((st) => st.submit);
  const toggleFlag = useAppStore((st) => st.toggleFlag);
  const [calc, setCalc] = useState(false);
  const [confirm, setConfirm] = useState<null | 'submit' | 'leave'>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const isMock = s?.mode === 'mock';
  const now = useNow(!!s && isMock && !s.submittedAt);
  const left = s ? remainingSec(s, now) : null;

  const groupsInSession: Group[] = useMemo(
    () => (s ? (s.groupIds.map((g) => getGroup(g)).filter(Boolean) as Group[]) : []),
    [s?.groupIds], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const itemsOf = (g: Group): Item[] => (s?.itemIds ? g.items.filter((i) => s.itemIds!.includes(i.id)) : g.items);

  // 時間到自動交卷
  useEffect(() => {
    if (s && isMock && !s.submittedAt && left === 0) {
      submit(s.id);
      router.replace({ pathname: '/result/[id]', params: { id: s.id } });
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const [shownIndex, setShownIndex] = useState(s?.index);
  if (s && s.index !== shownIndex) {
    setShownIndex(s.index);
    setShowOriginal(false);
  }
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [s?.index]);

  if (!s) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: space.md }}>
        <AppText variant="heading">找不到這份作答紀錄</AppText>
        <Button title="回首頁" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const group = groupsInSession[s.index];
  const items = group ? itemsOf(group) : [];
  const allItems = groupsInSession.flatMap((g) => itemsOf(g));
  const unanswered = allItems.filter((it) => !isAnswered(it, s.answers[it.id])).length;
  const locked = !!s.submittedAt;
  const practice = s.mode !== 'mock';
  const study = s.mode === 'study';
  const last = s.index >= groupsInSession.length - 1;
  const lowTime = left != null && left <= 300;

  const go = (i: number) => {
    haptic('light');
    setIndex(s.id, Math.max(0, Math.min(groupsInSession.length - 1, i)));
  };
  const finish = () => {
    submit(s.id);
    haptic('success');
    router.replace({ pathname: '/result/[id]', params: { id: s.id } });
  };
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const groupState = (g: Group) => {
    const its = itemsOf(g);
    const n = its.filter((it) => isAnswered(it, s.answers[it.id])).length;
    const flagged = its.some((it) => s.flagged[it.id]);
    return { done: n === its.length, partial: n > 0 && n < its.length, flagged };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* 頂部：標題、計時、計算機 */}
      <View style={{ backgroundColor: colors.hero, paddingTop: insets.top }}>
        <View style={styles.topBar}>
          <IconButton icon="close" label="離開" color={colors.heroInk} onPress={() => (locked || practice ? leave() : setConfirm('leave'))} />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={colors.inkMute} numberOfLines={1}>
              {isMock ? `電腦化測試・${groupsInSession.length} 題組` : study ? '直接看答案・不計分、不列入紀錄' : s.mode === 'official' ? '官方舊題・自我評量' : s.mode === 'review' ? '錯題複習・作答後看解析' : '練習模式・作答後看解析'}
            </AppText>
            <AppText variant="bodyStrong" color={colors.heroInk} numberOfLines={1}>
              {s.title}
            </AppText>
          </View>
          {isMock && left != null && !locked && (
            <View style={[styles.timer, { backgroundColor: lowTime ? colors.danger : 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name="timer-outline" size={16} color={lowTime ? '#fff' : colors.accent} />
              <AppText variant="bodyStrong" mono color={lowTime ? '#fff' : colors.heroInk}>
                {fmtClock(left)}
              </AppText>
            </View>
          )}
          <IconButton icon="calculator-outline" label="計算機" color={colors.heroInk} onPress={() => setCalc(true)} />
        </View>
        {isMock && <HazardStripe height={5} />}
        {/* 題組導覽 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
          {groupsInSession.map((g, i) => {
            const st = groupState(g);
            const cur = i === s.index;
            return (
              <Pressable
                key={g.id}
                onPress={() => go(i)}
                accessibilityLabel={`第 ${i + 1} 題組`}
                style={[
                  styles.navChip,
                  {
                    backgroundColor: cur ? colors.accent : st.done ? 'rgba(255,255,255,0.18)' : 'transparent',
                    borderColor: cur ? colors.accent : st.done ? 'transparent' : 'rgba(255,255,255,0.25)',
                  },
                ]}>
                <AppText variant="smallStrong" mono color={cur ? colors.accentInk : colors.heroInk}>
                  {i + 1}
                </AppText>
                {st.flagged && <View style={[styles.flagDot, { backgroundColor: colors.accent }]} />}
                {st.partial && !cur && <View style={[styles.partialBar, { backgroundColor: colors.accent }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ alignItems: 'center', paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View style={styles.body}>
          {group && (
            <>
              <View style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <AppText variant="caption" color={colors.inkSoft} mono>
                    題組 {s.index + 1}/{groupsInSession.length}
                  </AppText>
                  <Tag
                    label={group.source === 'official-old' ? `${group.session} 第 ${group.no} 題` : categoryMeta[group.category].short}
                    color="#fff"
                    bg={colors[categoryMeta[group.category].key]}
                  />
                  {group.source === 'self' && <Tag label="10 分" />}
                </View>
                <AppText variant="title">{group.title}</AppText>
                <AppText variant="caption" color={colors.inkMute}>
                  {group.topic}
                </AppText>
              </View>

              {group.source === 'official-old' && !group.context && officialLead(group) && (
                <Card style={{ gap: space.sm, borderLeftWidth: 4, borderLeftColor: colors.accent }}>
                  <AppText variant="caption" color={colors.inkSoft}>
                    題目
                  </AppText>
                  <AppText variant="body" style={{ fontWeight: '600' }}>
                    {officialLead(group)}
                  </AppText>
                </Card>
              )}

              {group.source === 'official-old' && group.originalText && (
                <Card tone="alt" style={{ gap: space.sm }}>
                  <Pressable onPress={() => setShowOriginal((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Ionicons name="document-text-outline" size={18} color={colors.ink} />
                    <AppText variant="smallStrong" style={{ flex: 1 }}>
                      官方試卷原文
                    </AppText>
                    <Ionicons name={showOriginal ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkSoft} />
                  </Pressable>
                  {showOriginal && <AppText variant="small">{group.originalText}</AppText>}
                  {!!group.omittedParts?.length && (
                    <AppText variant="caption" color={colors.inkSoft}>
                      未收錄小題：
                      {group.omittedParts
                        .map((p) => (typeof p === 'string' ? p : `${p.part}（${p.reason}）`))
                        .join('；')}
                    </AppText>
                  )}
                  {group.hasFigure && (
                    <AppText variant="caption" color={colors.danger}>
                      原題附有圖表，本 APP 僅以文字呈現{group.figureNote ? `：${group.figureNote}` : '。'}
                    </AppText>
                  )}
                </Card>
              )}

              {group.context && (
                <Card tone="accent" style={{ flexDirection: 'row', gap: space.sm }}>
                  <Ionicons name="clipboard-outline" size={18} color={colors.ink} style={{ marginTop: 4 }} />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {group.context}
                  </AppText>
                </Card>
              )}

              {items.map((it, i) => {
                const shown = locked || !!s.revealed[it.id];
                const essay = it.type === 'essay';
                if (study) {
                  return <QuestionCard key={it.id} item={it} index={i + 1} answer={undefined} onChange={() => {}} review showExplanation study />;
                }
                return (
                  <View key={it.id} style={{ gap: space.sm }}>
                    <QuestionCard
                      item={it}
                      index={i + 1}
                      answer={s.answers[it.id]}
                      onChange={(a) => {
                        setAnswer(s.id, it.id, a);
                        if (essay && practice && !s.revealed[it.id]) reveal(s.id, it);
                      }}
                      review={essay ? locked : shown}
                      showExplanation={essay ? !!s.answers[it.id] || locked : shown}
                      flagged={!!s.flagged[it.id]}
                      onFlag={isMock ? () => toggleFlag(s.id, it.id) : undefined}
                    />
                    {practice && !shown && !essay && (
                      <Button
                        title={isAnswered(it, s.answers[it.id]) ? '對答案・看解析' : '直接看解析'}
                        variant={isAnswered(it, s.answers[it.id]) ? 'primary' : 'outline'}
                        icon="bulb-outline"
                        compact
                        onPress={() => {
                          reveal(s.id, it);
                          haptic('light');
                        }}
                      />
                    )}
                  </View>
                );
              })}

              {study && (
                <Button
                  title="換我作答這個題組"
                  variant="outline"
                  icon="create-outline"
                  onPress={() => startPractice(group.title, [group.id])}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* 底部操作列 */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.footerInner}>
          <Button title="上一組" variant="outline" icon="chevron-back" compact disabled={s.index === 0} onPress={() => go(s.index - 1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            {!locked && (
              <AppText variant="caption" color={colors.inkMute}>
                {study ? `題組 ${s.index + 1}/${groupsInSession.length}` : `未作答 ${unanswered} 題`}
              </AppText>
            )}
          </View>
          {last ? (
            study ? (
              <Button title="看完了" variant="accent" icon="checkmark-done" compact onPress={leave} />
            ) : locked ? (
              <Button title="看成績" variant="accent" icon="ribbon-outline" compact onPress={() => router.replace({ pathname: '/result/[id]', params: { id: s.id } })} />
            ) : (
              <Button title={isMock ? '交卷' : '完成'} variant="accent" icon="checkmark-done" compact onPress={() => (isMock ? setConfirm('submit') : finish())} />
            )
          ) : (
            <Button title="下一組" variant="primary" icon="chevron-forward" iconRight compact onPress={() => go(s.index + 1)} />
          )}
        </View>
      </View>

      <CalculatorSheet visible={calc} onClose={() => setCalc(false)} />

      <Sheet visible={confirm != null} onClose={() => setConfirm(null)} title={confirm === 'submit' ? '確定交卷？' : '要離開測驗嗎？'}>
        <View style={{ gap: space.md }}>
          {confirm === 'submit' ? (
            <AppText variant="body" color={colors.inkSoft}>
              {unanswered > 0 ? `還有 ${unanswered} 題未作答，交卷後不能再修改。` : '所有題目都已作答。交卷後不能再修改。'}
            </AppText>
          ) : (
            <AppText variant="body" color={colors.inkSoft}>
              作答進度會保留，計時不會暫停。可以從首頁「繼續作答」回來。
            </AppText>
          )}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="取消" variant="outline" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
            {confirm === 'submit' ? (
              <Button title="交卷" variant="accent" style={{ flex: 1 }} onPress={() => (setConfirm(null), finish())} />
            ) : (
              <Button title="離開" variant="primary" style={{ flex: 1 }} onPress={() => (setConfirm(null), leave())} />
            )}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm, maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  nav: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  navChip: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  flagDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3 },
  partialBar: { position: 'absolute', bottom: 4, width: 14, height: 3, borderRadius: 2 },
  body: { width: '100%', maxWidth: MAX_WIDTH, padding: space.lg, gap: space.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, alignItems: 'center' },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: space.lg },
});
