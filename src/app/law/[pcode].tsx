import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, IconButton, Tag } from '@/components/ui/primitives';
import { getLaw } from '@/lib/bank';
import type { LawArticle } from '@/lib/types';
import { MAX_WIDTH, radius, space, useTheme } from '@/theme';

function articleUrl(pcode: string, no: string) {
  return `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${pcode}&flno=${no}`;
}

function ArticleView({ a, pcode, focus }: { a: LawArticle; pcode: string; focus?: boolean }) {
  const { colors } = useTheme();
  const isTable = a.no.startsWith('附表');
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
      <AppText variant="body" style={{ lineHeight: 28 }}>
        {a.text}
      </AppText>
    </View>
  );
}

export default function LawScreen() {
  const { colors } = useTheme();
  const { pcode, a } = useLocalSearchParams<{ pcode: string; a?: string }>();
  const law = getLaw(pcode);
  const [q, setQ] = useState('');
  const focus = law?.articles.find((x) => x.no === a);
  const list = useMemo(() => {
    if (!law) return [];
    const t = q.trim();
    if (!t) return law.articles;
    return law.articles.filter((x) => x.text.includes(t) || x.no === t);
  }, [law, q]);

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
                <ArticleView a={focus} pcode={law.pcode} focus />
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
          </View>
        }
        renderItem={({ item }) => <ArticleView a={item} pcode={law.pcode} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  article: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md },
});
