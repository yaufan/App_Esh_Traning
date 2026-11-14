import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  HazardStripe,
  IconButton,
  ProgressBar,
  Screen,
  SectionTitle,
  Tag,
  type IconName,
} from '@/components/ui/primitives';
import { PlanSheet } from '@/components/ui/plan-sheet';
import { fillCards, meta, officialSessions } from '@/lib/bank';
import { findOpen, startMock, startRandomPractice, startWrongReview } from '@/lib/start';
import { fmtClock, fmtDate, remainingSec, useOverview, useToday } from '@/lib/stats';
import { useAppStore } from '@/lib/store';
import { categoryMeta, radius, space, useTheme } from '@/theme';

function Stat({ value, label, suffix }: { value: string; label: string; suffix?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <AppText variant="title" mono>
          {value}
        </AppText>
        {suffix && (
          <AppText variant="smallStrong" color={colors.inkSoft}>
            {suffix}
          </AppText>
        )}
      </View>
      <AppText variant="caption" color={colors.inkSoft}>
        {label}
      </AppText>
    </View>
  );
}

function QuickTile({ icon, title, sub, onPress, tint }: { icon: IconName; title: string; sub: string; onPress: () => void; tint: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.tileIcon, { backgroundColor: tint + '1F' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="caption" color={colors.inkSoft}>
        {sub}
      </AppText>
    </Pressable>
  );
}

export default function Home() {
  const { colors } = useTheme();
  const ov = useOverview();
  const today = useToday();
  const [plan, setPlan] = useState(false);
  const sessions = useAppStore((s) => s.sessions);
  const history = useAppStore((s) => s.history);
  const setSetting = useAppStore((s) => s.setSetting);
  const openMock = findOpen('mock');
  const left = openMock ? remainingSec(openMock) : null;
  const recent = history
    .map((id) => sessions[id])
    .filter((s) => s?.submittedAt)
    .slice(0, 3);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={colors.inkSoft}>
            職業安全衛生管理 乙級技術士
          </AppText>
          <AppText variant="display">術科練習</AppText>
        </View>
        <IconButton icon="information-circle-outline" label="關於與資料來源" onPress={() => router.push('/about')} />
      </View>

      {/* 全真模擬 */}
      <Card tone="hero" padded={false} style={{ overflow: 'hidden' }}>
        <HazardStripe height={10} />
        <View style={{ padding: space.xl, gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Tag label="電腦化測試" bg="rgba(255,255,255,0.12)" color={colors.heroInk} icon="desktop-outline" />
            <Tag label="7 種題型" bg="rgba(255,255,255,0.12)" color={colors.heroInk} />
          </View>
          <AppText variant="title" color={colors.heroInk}>
            全真模擬考
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.xl }}>
            {[
              ['10', '題組'],
              ['100', '分鐘'],
              ['60', '分及格'],
            ].map(([n, l]) => (
              <View key={l}>
                <AppText variant="title" mono color={colors.accent}>
                  {n}
                </AppText>
                <AppText variant="caption" color={colors.inkMute}>
                  {l}
                </AppText>
              </View>
            ))}
          </View>
          <Button
            title={openMock ? `繼續作答・剩 ${fmtClock(left ?? 0)}` : '開始模擬考'}
            variant="accent"
            icon={openMock ? 'play' : 'timer-outline'}
            onPress={startMock}
          />
        </View>
      </Card>

      {/* 今天的進度：每日目標、考試倒數、到期的錯題 */}
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AppText variant="smallStrong">今天</AppText>
              <AppText variant="heading" mono color={today.done >= today.goal ? colors.success : colors.ink}>
                {today.done}
              </AppText>
              <AppText variant="small" color={colors.inkSoft}>
                / {today.goal} 題
              </AppText>
              {today.streak > 1 && <Tag label={`連續 ${today.streak} 天`} icon="flame-outline" color={colors.cat3} />}
            </View>
            <ProgressBar value={today.goal ? today.done / today.goal : 0} color={today.done >= today.goal ? colors.success : colors.accent} />
          </View>
          <Pressable
            onPress={() => setPlan(true)}
            accessibilityLabel="設定考試日期與每日目標"
            style={({ pressed }) => [styles.countdown, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.8 : 1 }]}>
            {today.daysLeft != null ? (
              <>
                <AppText variant="caption" color={colors.inkSoft}>
                  {today.daysLeft >= 0 ? '距離考試' : '考試已過'}
                </AppText>
                <AppText variant="title" mono color={today.daysLeft >= 0 && today.daysLeft <= 14 ? colors.danger : colors.ink}>
                  {Math.abs(today.daysLeft)}
                  <AppText variant="caption" color={colors.inkSoft}>
                    {' '}天
                  </AppText>
                </AppText>
              </>
            ) : (
              <>
                <Ionicons name="calendar-outline" size={20} color={colors.ink} />
                <AppText variant="caption" color={colors.inkSoft}>
                  設定考試日
                </AppText>
              </>
            )}
          </Pressable>
        </View>
        {today.dueIds.length > 0 && (
          <Button
            title={`複習今天到期的錯題 ${today.dueIds.length} 題`}
            compact
            variant="outline"
            icon="refresh"
            onPress={() => startWrongReview(today.dueIds)}
          />
        )}
      </Card>

      {/* 數據 */}
      <View style={styles.statRow}>
        <Stat value={String(ov.seen)} suffix={`/${ov.totalItems}`} label="已練習子題" />
        <Stat value={ov.seen ? String(Math.round(ov.accuracy * 100)) : '–'} suffix={ov.seen ? '%' : undefined} label="最近一次答對率" />
        <Stat value={String(ov.wrongCount)} label="錯題本" />
      </View>

      <SectionTitle title="三大類進度" action="學習分析" onAction={() => router.push('/stats')} />
      <Card style={{ gap: space.lg }}>
        {ov.byCat.map((c) => {
          const m = categoryMeta[c.category];
          const tint = colors[m.key];
          return (
            <View key={c.category} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={[styles.catDot, { backgroundColor: tint }]} />
                <AppText variant="smallStrong" style={{ flex: 1 }}>
                  {m.name}
                </AppText>
                <AppText variant="small" mono color={colors.inkSoft}>
                  {c.done}/{c.total}
                </AppText>
              </View>
              <ProgressBar value={c.total ? c.done / c.total : 0} color={tint} />
              {c.done > 0 && (
                <AppText variant="caption" color={colors.inkMute}>
                  答對 {c.correct} 題・答對率 {Math.round((c.correct / c.done) * 100)}%
                </AppText>
              )}
            </View>
          );
        })}
      </Card>

      <SectionTitle title="快速開始" />
      <View style={styles.tileGrid}>
        <QuickTile
          icon="eye-outline"
          title="直接看答案"
          sub="不用作答，讀答案與解析"
          tint={colors.success}
          onPress={() => {
            setSetting('studyMode', true);
            router.push('/practice');
          }}
        />
        <QuickTile icon="shuffle" title="隨機 5 題組" sub="優先出還沒做過的" tint={colors.info} onPress={() => startRandomPractice(5)} />
        <QuickTile
          icon="document-text-outline"
          title="官方舊題"
          sub={`${officialSessions().length} 個梯次・舊制問答`}
          tint={colors.cat2}
          onPress={() => router.push({ pathname: '/practice', params: { tab: 'official' } })}
        />
        <QuickTile icon="refresh-circle-outline" title="錯題複習" sub={`今天到期 ${today.dueIds.length} 題`} tint={colors.danger} onPress={() => router.push('/review')} />
        <QuickTile icon="albums-outline" title="數字速記卡" sub={`${fillCards.length} 張・數值與期限`} tint={colors.cat2} onPress={() => router.push('/cards')} />
        <QuickTile icon="library-outline" title="查法規" sub="題目引用的條文全文" tint={colors.cat3} onPress={() => router.push('/laws')} />
      </View>

      {recent.length > 0 && (
        <>
          <SectionTitle title="最近紀錄" />
          <Card padded={false}>
            {recent.map((s, i) => {
              const pass = s.mode === 'mock' && (s.score ?? 0) >= 60;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push({ pathname: '/result/[id]', params: { id: s.id } })}
                  style={[styles.recent, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyStrong">{s.title}</AppText>
                    <AppText variant="caption" color={colors.inkMute}>
                      {fmtDate(s.submittedAt!)}
                    </AppText>
                  </View>
                  {s.maxScore ? (
                    <AppText variant="heading" mono color={s.mode === 'mock' ? (pass ? colors.success : colors.danger) : colors.ink}>
                      {s.score}
                      <AppText variant="small" color={colors.inkMute}>
                        /{s.maxScore}
                      </AppText>
                    </AppText>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.inkMute} />
                </Pressable>
              );
            })}
          </Card>
        </>
      )}

      <Card tone="alt" onPress={() => router.push('/about')} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <Ionicons name="shield-checkmark-outline" size={26} color={colors.ink} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="smallStrong">每題都附法規條文依據</AppText>
          <AppText variant="caption" color={colors.inkSoft}>
            依全國法規資料庫現行條文撰寫・法規版本 {meta.lawsRetrievedAt}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMute} />
      </Card>

      <PlanSheet visible={plan} onClose={() => setPlan(false)} suggested={today.suggested} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: space.md },
  statRow: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
  countdown: { minWidth: 84, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md, alignItems: 'center', gap: 2 },
  catDot: { width: 10, height: 10, borderRadius: 3 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.5%', flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
