import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Tag } from '@/components/ui/primitives';
import { describeAnswer, gradeItem } from '@/lib/grading';
import { typeLabel, type AnswerValue, type Item } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';
import { LinkingQ, OrderingQ } from './arrange';
import { MultiQ, SingleQ, TrueFalseQ } from './choice';
import { CitationCard } from './citation';
import { CalcQ, FillQ, MatchingQ, StepsBlock } from './inputs';
import type { QProps } from './shared';

function EssayQ({ item, answer, onChange, review }: QProps<Extract<Item, { type: 'essay' }>>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(review);
  const v = answer?.type === 'essay' ? answer.value : null;
  return (
    <View style={{ gap: space.md }}>
      {!open ? (
        <View style={[styles.essayPrompt, { borderColor: colors.line, backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="create-outline" size={20} color={colors.inkSoft} />
          <AppText variant="small" color={colors.inkSoft} style={{ flex: 1 }}>
            先在紙上或心裡寫出答案要點，再展開參考答案對照。
          </AppText>
        </View>
      ) : (
        <View style={[styles.model, { backgroundColor: colors.successSoft }]}>
          <AppText variant="caption" color={colors.success}>
            參考答案（依現行法規）
          </AppText>
          {item.modelAnswer.map((m, i) => (
            <AppText key={i} variant="body">
              {m}
            </AppText>
          ))}
        </View>
      )}
      {!open ? (
        <Button title="展開參考答案" variant="outline" icon="eye-outline" onPress={() => setOpen(true)} />
      ) : (
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" color={colors.inkSoft}>
            自我評量
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              title="我會了"
              compact
              icon="checkmark"
              variant={v === 'know' ? 'primary' : 'outline'}
              style={{ flex: 1 }}
              onPress={() => onChange({ type: 'essay', value: 'know' })}
            />
            <Button
              title="還不熟"
              compact
              icon="refresh"
              variant={v === 'unsure' ? 'danger' : 'outline'}
              style={{ flex: 1 }}
              onPress={() => onChange({ type: 'essay', value: 'unsure' })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export function QuestionBody(props: QProps) {
  const { item } = props;
  switch (item.type) {
    case 'truefalse':
      return <TrueFalseQ {...(props as QProps<typeof item>)} />;
    case 'single':
      return <SingleQ {...(props as QProps<typeof item>)} />;
    case 'multi':
      return <MultiQ {...(props as QProps<typeof item>)} />;
    case 'matching':
      return <MatchingQ {...(props as QProps<typeof item>)} />;
    case 'fill':
      return <FillQ {...(props as QProps<typeof item>)} />;
    case 'ordering':
      return <OrderingQ {...(props as QProps<typeof item>)} />;
    case 'linking':
      return <LinkingQ {...(props as QProps<typeof item>)} />;
    case 'calc':
      return <CalcQ {...(props as QProps<typeof item>)} />;
    case 'essay':
      return <EssayQ {...(props as QProps<typeof item>)} />;
  }
}

/** 一個子題：題號＋題型＋配分＋題幹＋作答區＋（檢討時）解析 */
export function QuestionCard({
  item,
  index,
  answer,
  onChange,
  review,
  showExplanation,
  flagged,
  onFlag,
}: {
  item: Item;
  index: number;
  answer: AnswerValue | undefined;
  onChange: (a: AnswerValue) => void;
  review: boolean;
  showExplanation: boolean;
  flagged?: boolean;
  onFlag?: () => void;
}) {
  const { colors } = useTheme();
  const result = review ? gradeItem(item, answer) : undefined;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.head}>
        <View style={[styles.no, { backgroundColor: colors.hero }]}>
          <AppText variant="smallStrong" mono color={colors.heroInk}>
            {index}
          </AppText>
        </View>
        <Tag label={typeLabel[item.type]} />
        {item.type !== 'essay' && <Tag label={`${item.points} 分`} icon="star-outline" />}
        <View style={{ flex: 1 }} />
        {review && item.type !== 'essay' && result && (
          <Tag
            label={result.correct ? '答對' : result.earned > 0 ? `部分 ${result.earned} 分` : result.answered ? '答錯' : '未作答'}
            color={result.correct ? colors.success : colors.danger}
            bg={result.correct ? colors.successSoft : colors.dangerSoft}
            icon={result.correct ? 'checkmark' : 'close'}
          />
        )}
        {onFlag && !review && (
          <Pressable onPress={onFlag} hitSlop={10} accessibilityLabel="標記此題">
            <Ionicons name={flagged ? 'flag' : 'flag-outline'} size={20} color={flagged ? colors.accent : colors.inkMute} />
          </Pressable>
        )}
      </View>
      {item.type !== 'fill' && (
        <AppText variant="body" style={{ fontWeight: '600' }}>
          {item.stem}
        </AppText>
      )}
      <QuestionBody item={item} answer={answer} onChange={onChange} review={review} result={result} />
      {showExplanation && <Explanation item={item} />}
    </View>
  );
}

export function Explanation({ item }: { item: Item }) {
  const { colors } = useTheme();
  const steps = item.type === 'calc' ? item.steps : item.type === 'fill' ? item.steps : undefined;
  return (
    <View style={[styles.explain, { borderTopColor: colors.line }]}>
      {item.type !== 'essay' && (
        <View style={[styles.answerBar, { backgroundColor: colors.successSoft }]}>
          <AppText variant="caption" color={colors.success}>
            正確答案
          </AppText>
          <AppText variant="bodyStrong">{describeAnswer(item)}</AppText>
        </View>
      )}
      {steps && steps.length > 0 && (
        <View style={{ gap: 6 }}>
          <AppText variant="caption" color={colors.inkSoft}>
            計算過程
          </AppText>
          <StepsBlock steps={steps} />
        </View>
      )}
      <View style={{ gap: 6 }}>
        <AppText variant="caption" color={colors.inkSoft}>
          解析
        </AppText>
        <AppText variant="body">{item.explanation}</AppText>
      </View>
      {item.lawChangeNote && (
        <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.ink} />
          <AppText variant="small" style={{ flex: 1 }}>
            {item.lawChangeNote}
          </AppText>
        </View>
      )}
      {item.basisNote && (
        <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="calculator-outline" size={18} color={colors.ink} />
          <AppText variant="small" style={{ flex: 1 }}>
            {item.basisNote}
          </AppText>
        </View>
      )}
      {item.citations.length > 0 && (
        <View style={{ gap: space.sm }}>
          <AppText variant="caption" color={colors.inkSoft}>
            法規依據（點選看全文）
          </AppText>
          {item.citations.map((c, i) => (
            <CitationCard key={i} c={c} expanded />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  no: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  explain: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, gap: space.md },
  answerBar: { borderRadius: radius.md, padding: space.md, gap: 2 },
  note: { flexDirection: 'row', gap: space.sm, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' },
  essayPrompt: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, padding: space.md },
  model: { borderRadius: radius.md, padding: space.md, gap: 6 },
});
