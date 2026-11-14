import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { AppText, Button, Card, EmptyState, IconButton, ProgressBar, Screen, SectionTitle, Tag } from '@/components/ui/primitives';
import { startMock, startPractice } from '@/lib/start';
import { useAnalysis, useToday, type TopicStat } from '@/lib/stats';
import { typeLabel, type ItemType } from '@/lib/types';
import { categoryMeta, fonts, space, useTheme } from '@/theme';

const MIN_SEEN = 3;

function MockChart({ data }: { data: { id: string; at: number; score: number }[] }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const H = 170;
  const pad = { l: 30, r: 16, t: 22, b: 24 };
  const inset = 18; // 第一個和最後一個點離座標軸遠一點，分數標籤才不會蓋到刻度
  const x = (i: number) =>
    data.length === 1 ? (pad.l + w - pad.r) / 2 : pad.l + inset + (i * (w - pad.l - pad.r - inset * 2)) / (data.length - 1);
  const y = (v: number) => pad.t + ((100 - v) * (H - pad.t - pad.b)) / 100;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[0, 60, 100].map((v) => (
            <Line
              key={v}
              x1={pad.l}
              x2={w - pad.r}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 60 ? colors.danger : colors.line}
              strokeWidth={1}
              strokeDasharray={v === 60 ? '5 4' : undefined}
            />
          ))}
          {[0, 60, 100].map((v) => (
            <SvgText key={v} x={pad.l - 6} y={y(v) + 4} fontSize={11} fill={v === 60 ? colors.danger : colors.inkMute} textAnchor="end" fontFamily={fonts.mono}>
              {v}
            </SvgText>
          ))}
          {data.length > 1 && (
            <Polyline points={data.map((d, i) => `${x(i)},${y(d.score)}`).join(' ')} fill="none" stroke={colors.info} strokeWidth={2.5} strokeLinejoin="round" />
          )}
          {data.map((d, i) => (
            <Circle key={d.id} cx={x(i)} cy={y(d.score)} r={5} fill={d.score >= 60 ? colors.success : colors.danger} stroke={colors.surface} strokeWidth={2} />
          ))}
          {data.map((d, i) => (
            <SvgText key={d.id} x={x(i)} y={y(d.score) - 10} fontSize={11} fill={colors.ink} textAnchor="middle" fontFamily={fonts.mono}>
              {d.score}
            </SvgText>
          ))}
          {data.map((d, i) => {
            const t = new Date(d.at);
            return (
              <SvgText key={d.id} x={x(i)} y={H - 6} fontSize={10} fill={colors.inkMute} textAnchor="middle" fontFamily={fonts.mono}>
                {`${t.getMonth() + 1}/${t.getDate()}`}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

function TopicRow({ t, first }: { t: TopicStat; first: boolean }) {
  const { colors } = useTheme();
  const tint = colors[categoryMeta[t.category].key];
  const pct = Math.round((t.accuracy ?? 0) * 100);
  return (
    <View style={[styles.topicRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
      <View style={[styles.catBar, { backgroundColor: tint }]} />
      <View style={{ flex: 1, gap: 5 }}>
        <AppText variant="bodyStrong">{t.topic}</AppText>
        <ProgressBar value={t.accuracy ?? 0} color={pct >= 80 ? colors.success : pct >= 60 ? colors.accent : colors.danger} height={6} />
        <AppText variant="caption" color={colors.inkSoft}>
          答對 {t.correct}/{t.seen} 題（{pct}%）・共 {t.total} 題
        </AppText>
      </View>
      <Button title="練習" compact variant="outline" icon="play" onPress={() => startPractice(t.topic, t.groupIds)} />
    </View>
  );
}

export default function Stats() {
  const { colors } = useTheme();
  const { topics, byType, mocks, days } = useAnalysis();
  const today = useToday();

  const rated = topics.filter((t) => t.seen >= MIN_SEEN).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const weak = rated.filter((t) => (t.accuracy ?? 0) < 0.8).slice(0, 6);
  const fresh = topics.filter((t) => t.seen === 0);
  const maxDay = Math.max(today.goal, ...days.map((d) => d.n), 1);
  const best = mocks.length ? Math.max(...mocks.map((m) => m.score)) : null;
  const types = Object.entries(byType) as [ItemType, { n: number; ok: number }][];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.sm }}>
        <IconButton icon="chevron-back" label="返回" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <AppText variant="title" style={{ flex: 1 }}>
          學習分析
        </AppText>
      </View>

      <SectionTitle title="最需要加強的主題" />
      {rated.length === 0 ? (
        <Card>
          <EmptyState icon="analytics-outline" title="資料還不夠" body={`每個主題至少作答 ${MIN_SEEN} 題後，這裡會依答對率排出最弱的主題。`} />
        </Card>
      ) : weak.length === 0 ? (
        <Card tone="alt" style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Ionicons name="trophy-outline" size={22} color={colors.success} />
          <AppText variant="small" style={{ flex: 1 }}>
            練過的主題答對率都在 80% 以上。可以往下挑還沒練過的主題。
          </AppText>
        </Card>
      ) : (
        <Card padded={false}>
          {weak.map((t, i) => (
            <TopicRow key={t.category + t.topic} t={t} first={i === 0} />
          ))}
        </Card>
      )}
      <AppText variant="caption" color={colors.inkMute}>
        答對率以每一題「最近一次」的作答結果計算；只列出已作答 {MIN_SEEN} 題以上、答對率低於 80% 的主題。
      </AppText>

      {fresh.length > 0 && (
        <>
          <SectionTitle title={`還沒練過的主題 ${fresh.length}`} />
          <Card padded={false}>
            {fresh.map((t, i) => (
              <View key={t.category + t.topic} style={[styles.topicRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                <View style={[styles.catBar, { backgroundColor: colors[categoryMeta[t.category].key] }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong">{t.topic}</AppText>
                  <AppText variant="caption" color={colors.inkSoft}>
                    {categoryMeta[t.category].short}・{t.groupIds.length} 題組・{t.total} 題
                  </AppText>
                </View>
                <Button title="開始" compact variant="outline" icon="play" onPress={() => startPractice(t.topic, t.groupIds)} />
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle title="模擬考成績" />
      <Card style={{ gap: space.md }}>
        {mocks.length === 0 ? (
          <>
            <AppText variant="small" color={colors.inkSoft}>
              還沒有交卷的模擬考。考過之後，這裡會畫出每次的分數和 60 分及格線。
            </AppText>
            <Button title="開始模擬考" variant="accent" icon="timer-outline" onPress={startMock} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Tag label={`最近 ${mocks.length} 次`} />
              <Tag label={`最高 ${best} 分`} color={colors.success} bg={colors.successSoft} />
              <Tag label={`及格 ${mocks.filter((m) => m.score >= 60).length} 次`} />
            </View>
            <MockChart data={mocks} />
          </>
        )}
      </Card>

      <SectionTitle title="最近 14 天" />
      <Card style={{ gap: space.sm }}>
        <View style={styles.bars}>
          {days.map((d) => (
            <View key={d.key} style={styles.barCol}>
              <AppText variant="caption" mono color={colors.inkMute} style={{ fontSize: 10 }}>
                {d.n || ''}
              </AppText>
              <View
                style={{
                  width: '70%',
                  height: Math.max(3, (d.n / maxDay) * 84),
                  borderRadius: 4,
                  backgroundColor: d.n === 0 ? colors.line : d.n >= today.goal ? colors.success : colors.accent,
                }}
              />
              <AppText variant="caption" mono color={colors.inkMute} style={{ fontSize: 10 }}>
                {new Date(d.ts).getDate()}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.inkSoft}>
          每天作答的子題數；綠色是達到每日目標（{today.goal} 題）的日子。
          {today.streak > 0 ? `目前連續 ${today.streak} 天有練習。` : ''}
        </AppText>
      </Card>

      {types.length > 0 && (
        <>
          <SectionTitle title="各題型答對率" />
          <Card style={{ gap: space.md }}>
            {types.map(([t, v]) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <AppText variant="small" style={{ width: 64 }}>
                  {typeLabel[t]}
                </AppText>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={v.ok / v.n} color={v.ok / v.n >= 0.8 ? colors.success : colors.info} />
                </View>
                <AppText variant="small" mono color={colors.inkSoft} style={{ width: 52, textAlign: 'right' }}>
                  {v.ok}/{v.n}
                </AppText>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  catBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
});
