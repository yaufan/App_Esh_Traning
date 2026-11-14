import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CitationCard } from '@/components/question/citation';
import { AppText, Button, Card, EmptyState, IconButton, ProgressBar, Screen, Tag, useHaptic } from '@/components/ui/primitives';
import { fillCards, shuffled, type FillCard } from '@/lib/bank';
import { useAppStore } from '@/lib/store';
import { categoryMeta, fonts, radius, space, useTheme, useType } from '@/theme';

type Cat = 0 | 1 | 2 | 3;

function buildDeck(cat: Cat, hideKnown: boolean): string[] {
  const known = useAppStore.getState().cardsKnown;
  return shuffled(fillCards.filter((c) => (cat === 0 || c.group.category === cat) && !(hideKnown && known[c.item.id]))).map((c) => c.item.id);
}

const cardById = new Map(fillCards.map((c) => [c.item.id, c]));

/** 題幹：正面把空格遮住，背面填上條文裡的數值 */
function CardStem({ card, back }: { card: FillCard; back: boolean }) {
  const { colors } = useTheme();
  const type = useType();
  const { item } = card;
  const parts = item.stem.split(/(\{\{[^}]+\}\})/g);
  return (
    <Text style={[type.body, { color: colors.ink, lineHeight: Math.round(type.body.fontSize * 2.1), fontWeight: '600' }]}>
      {parts.map((p, i) => {
        const m = p.match(/^\{\{(.+)\}\}$/);
        if (!m) return <Text key={i}>{p}</Text>;
        return (
          <Text
            key={i}
            style={[
              styles.blank,
              { fontFamily: fonts.mono, backgroundColor: back ? colors.successSoft : colors.accentSoft, color: back ? colors.success : colors.inkSoft },
            ]}>
            {back ? ` ${item.answer[m[1]]} ` : ' ？ '}
          </Text>
        );
      })}
    </Text>
  );
}

export default function Cards() {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const known = useAppStore((s) => s.cardsKnown);
  const setKnown = useAppStore((s) => s.setCardKnown);
  const resetCards = useAppStore((s) => s.resetCards);
  const [cat, setCat] = useState<Cat>(0);
  const [hideKnown, setHideKnown] = useState(true);
  const [deck, setDeck] = useState(() => buildDeck(0, true));
  const [pos, setPos] = useState(0);
  const [back, setBack] = useState(false);
  const [total, setTotal] = useState(deck.length);

  const restart = (c: Cat, h: boolean) => {
    const d = buildDeck(c, h);
    setCat(c);
    setHideKnown(h);
    setDeck(d);
    setTotal(d.length);
    setPos(0);
    setBack(false);
  };

  const inCat = fillCards.filter((c) => cat === 0 || c.group.category === cat);
  const knownInCat = inCat.filter((c) => known[c.item.id]).length;
  const card = cardById.get(deck[pos]);
  const done = pos >= deck.length;

  const answer = (ok: boolean) => {
    if (!card) return;
    haptic(ok ? 'success' : 'light');
    setKnown(card.item.id, ok);
    // 還不熟的排到這一輪最後再看一次
    if (!ok) setDeck((d) => [...d, card.item.id]);
    setPos((p) => p + 1);
    setBack(false);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.sm }}>
        <IconButton icon="chevron-back" label="返回" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">數字速記卡</AppText>
          <AppText variant="caption" color={colors.inkSoft}>
            條文裡的數值與期限・由審過的填空題產生
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {([0, 1, 2, 3] as const).map((c) => {
          const active = c === cat;
          const tint = c === 0 ? colors.ink : colors[categoryMeta[c].key];
          return (
            <Pressable
              key={c}
              onPress={() => restart(c, hideKnown)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.chip, { borderColor: active ? tint : colors.line, backgroundColor: active ? tint : colors.surface }]}>
              <AppText variant="smallStrong" color={active ? (c === 0 ? colors.bg : '#fff') : colors.inkSoft} numberOfLines={1}>
                {c === 0 ? '全部' : `第${['一', '二', '三'][c - 1]}類`}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AppText variant="caption" color={colors.inkSoft} style={{ flex: 1 }}>
            已記得 {knownInCat}/{inCat.length} 張
          </AppText>
          <Pressable onPress={() => restart(cat, !hideKnown)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={hideKnown ? 'checkbox' : 'square-outline'} size={18} color={hideKnown ? colors.success : colors.inkMute} />
            <AppText variant="caption" color={colors.inkSoft}>
              只看還不熟的
            </AppText>
          </Pressable>
        </View>
        <ProgressBar value={inCat.length ? knownInCat / inCat.length : 0} color={colors.success} height={6} />
      </View>

      {inCat.length === 0 ? (
        <EmptyState icon="albums-outline" title="這一類沒有速記卡" />
      ) : done || !card ? (
        <Card style={{ gap: space.md, alignItems: 'center' }}>
          <Ionicons name="checkmark-done-circle" size={44} color={colors.success} />
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {deck.length === 0 ? '這一類的卡片都記得了' : '這一輪看完了'}
          </AppText>
          <AppText variant="small" color={colors.inkSoft} style={{ textAlign: 'center' }}>
            已記得 {knownInCat}/{inCat.length} 張。
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
            {knownInCat < inCat.length && (
              <Button title="再看還不熟的" variant="primary" icon="refresh" style={{ flex: 1 }} onPress={() => restart(cat, true)} />
            )}
            <Button
              title="全部重來"
              variant="outline"
              icon="reload"
              style={{ flex: 1 }}
              onPress={() => {
                resetCards();
                restart(cat, false);
              }}
            />
          </View>
        </Card>
      ) : (
        <>
          <Pressable
            onPress={() => {
              haptic('light');
              setBack((b) => !b);
            }}
            accessibilityLabel={back ? '翻回正面' : '顯示答案'}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: back ? colors.success : colors.line }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Tag label={categoryMeta[card.group.category].short} color="#fff" bg={colors[categoryMeta[card.group.category].key]} />
              <AppText variant="caption" color={colors.inkMute} style={{ flex: 1 }} numberOfLines={1}>
                {card.group.topic}
              </AppText>
              <AppText variant="caption" mono color={colors.inkMute}>
                {Math.min(pos + 1, total)}/{total}
              </AppText>
            </View>
            {!!card.group.context && (
              <AppText variant="small" color={colors.inkSoft}>
                {card.group.context}
              </AppText>
            )}
            <CardStem card={card} back={back} />
            {!back && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: space.sm }}>
                <Ionicons name="hand-left-outline" size={15} color={colors.inkMute} />
                <AppText variant="caption" color={colors.inkMute}>
                  先在心裡回答，再點卡片看答案
                </AppText>
              </View>
            )}
          </Pressable>

          {back ? (
            <>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button title="還不熟" variant="outline" icon="refresh" style={{ flex: 1 }} onPress={() => answer(false)} />
                <Button title="記得了" variant="accent" icon="checkmark" style={{ flex: 1 }} onPress={() => answer(true)} />
              </View>
              <AppText variant="caption" color={colors.inkSoft}>
                法規依據（點選看全文）
              </AppText>
              {card.item.citations.map((c, i) => (
                <CitationCard key={i} c={c} expanded />
              ))}
            </>
          ) : (
            <Button title="顯示答案" variant="primary" icon="eye-outline" onPress={() => setBack(true)} />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 9, alignItems: 'center' },
  card: { borderWidth: 1.5, borderRadius: radius.lg, padding: space.lg, gap: space.md, minHeight: 220 },
  blank: { borderRadius: 6, fontWeight: '700', overflow: 'hidden' },
});
