import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, IconButton, Tag } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { citedBy, getLaw, plainStem } from '@/lib/bank';
import { startPractice, startStudy } from '@/lib/start';
import { typeLabel } from '@/lib/types';
import type { LawArticle } from '@/lib/types';
import { MAX_WIDTH, radius, space, useTheme } from '@/theme';

function articleUrl(pcode: string, no: string) {
  return `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${pcode}&flno=${no}`;
}

function ArticleView({ a, pcode, focus, onShowCited }: { a: LawArticle; pcode: string; focus?: boolean; onShowCited: (no: string) => void }) {
  const { colors } = useTheme();
  const isTable = a.no.startsWith('附表');
  const cited = citedBy(pcode, a.no).length;
  return (
    <View
      style={[
        styles.article,
        { backgroundColor: focus ? colors.accentSoft : colors.surface, borderColor: focus ? colors.accent : colors.line },
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="bodyStrong" mono>
          {isTable ? a.no : `第 ${a.no} 條`}
        </AppText>
        {a.pending && <Tag label="已公布、尚未施行" color={colors.danger} bg={colors.dangerSoft} />}
        <View style={{ flex: 1 }} />
        {!isTable && (
          <IconButton icon="open-outline" size={18} label="在全國法規資料庫開啟" onPress={() => WebBrowser.openBrowserAsync(articleUrl(pcode, a.no))} />
        )}
      </View>
      {!!a.chapter && (
        <AppText variant="caption" color={colors.inkMute}>
          {a.chapter}
        </AppText>
      )}
      <AppText variant="body">{a.text}</AppText>
      {cited > 0 && (
        <Pressable
          onPress={() => onShowCited(a.no)}
          accessibilityLabel={`看引用這一條的 ${cited} 題`}
          style={({ pressed }) => [styles.citedChip, { backgroundColor: colors.successSoft, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="help-circle-outline" size={16} color={colors.success} />
          <AppText variant="smallStrong" color={colors.success}>
            {cited} 題引用這一條
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.success} />
        </Pressable>
      )}
    </View>
  );
}

export default function LawScreen() {
  const { colors } = useTheme();
  const { pcode, a } = useLocalSearchParams<{ pcode: string; a?: string }>();
  const law = getLaw(pcode);
  const [q, setQ] = useState('');
  const [onlyCited, setOnlyCited] = useState(false);
  const [citedNo, setCitedNo] = useState<string | null>(null);
  const focus = law?.articles.find((x) => x.no === a);
  const list = useMemo(() => {
    if (!law) return [];
    const t = q.trim();
    let out = law.articles;
    if (onlyCited) out = out.filter((x) => citedBy(law.pcode, x.no).length > 0);
    if (t) out = out.filter((x) => x.text.includes(t) || x.no === t);
    return out;
  }, [law, q, onlyCited]);
  const citedCount = useMemo(() => (law ? law.articles.filter((x) => citedBy(law.pcode, x.no).length > 0).length : 0), [law]);
  const refs = law && citedNo ? citedBy(law.pcode, citedNo) : [];

  if (!law) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg }}>
        <IconButton icon="chevron-back" label="返回" onPress={() => router.back()} />
        <AppText>找不到這部法規。</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.bar, { borderBottomColor: colors.line }]}>
        <IconButton icon="chevron-back" label="返回" onPress={() => (router.canGoBack() ? router.back() : router.replace('/laws'))} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" numberOfLines={1}>
            {law.name}
          </AppText>
          <AppText variant="caption" color={colors.inkMute}>
            {law.modified}修正・全國法規資料庫
          </AppText>
        </View>
        <IconButton icon="open-outline" label="開啟官方網站" onPress={() => WebBrowser.openBrowserAsync(law.url)} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(x) => x.no}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 80, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {!!law.effectiveNote && (
              <Card tone="accent" style={{ flexDirection: 'row', gap: space.sm }}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.ink} />
                <AppText variant="small" style={{ flex: 1 }}>
                  施行日期註記：{law.effectiveNote}
                </AppText>
              </Card>
            )}
            {focus && !q && (
              <View style={{ gap: space.sm }}>
                <AppText variant="caption" color={colors.inkSoft}>
                  題目引用的條文
                </AppText>
                <ArticleView a={focus} pcode={law.pcode} focus onShowCited={setCitedNo} />
                <AppText variant="caption" color={colors.inkSoft} style={{ marginTop: space.sm }}>
                  全部條文
                </AppText>
              </View>
            )}
            <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Ionicons name="search" size={18} color={colors.inkMute} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="搜尋條文關鍵字或條號"
                placeholderTextColor={colors.inkMute}
                style={{ flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 10 }}
              />
            </View>
            {citedCount > 0 && (
              <Pressable onPress={() => setOnlyCited((v) => !v)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={onlyCited ? 'checkbox' : 'square-outline'} size={20} color={onlyCited ? colors.success : colors.inkMute} />
                <AppText variant="small" color={colors.inkSoft}>
                  只看有出題的條文（{citedCount} 條）
                </AppText>
              </Pressable>
            )}
            {list.length === 0 && (
              <AppText variant="small" color={colors.inkMute}>
                找不到符合的條文。
              </AppText>
            )}
          </View>
        }
        renderItem={({ item }) => <ArticleView a={item} pcode={law.pcode} onShowCited={setCitedNo} />}
      />

      <Sheet visible={citedNo != null} onClose={() => setCitedNo(null)} title={citedNo ? `引用${citedNo.startsWith('附表') ? citedNo : `第 ${citedNo} 條`}的題目` : ''}>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: space.md, paddingBottom: space.md }}>
          {refs.map(({ item, group }) => (
            <View key={item.id} style={[styles.refRow, { borderColor: colors.line }]}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Tag label={typeLabel[item.type]} />
                <AppText variant="caption" color={colors.inkMute} style={{ flex: 1 }} numberOfLines={1}>
                  {group.source === 'official-old' ? `${group.session} 官方舊題・` : ''}
                  {group.title}
                </AppText>
              </View>
              <AppText variant="small" numberOfLines={3}>
                {plainStem(item.stem)}
              </AppText>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button
                  title="看答案"
                  compact
                  variant="outline"
                  icon="eye-outline"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setCitedNo(null);
                    startStudy(group.title, [group.id]);
                  }}
                />
                <Button
                  title="作答"
                  compact
                  variant="primary"
                  icon="create-outline"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setCitedNo(null);
                    startPractice(group.title, [group.id]);
                  }}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  article: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: 6 },
  citedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  refRow: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md },
});
