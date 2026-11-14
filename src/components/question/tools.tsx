import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { meta } from '@/lib/bank';
import { useAppStore } from '@/lib/store';
import type { Item } from '@/lib/types';
import { radius, space, useTheme, useType } from '@/theme';

const ISSUES_URL = 'https://github.com/yaufan/App_Esh_Traning/issues/new';

function reportText(item: Item) {
  return [
    '【職安乙級術科練習・題目回報】',
    `題號：${item.id}`,
    `APP ${Constants.expoConfig?.version ?? ''}・題庫 ${meta.bankVersion}・法規版本 ${meta.lawsRetrievedAt}`,
    '我覺得有問題的地方：',
    '',
  ].join('\n');
}

/** 解析下方的工具列：我的筆記、回報題目有問題 */
export function ItemTools({ item }: { item: Item }) {
  const { colors } = useTheme();
  const type = useType();
  const note = useAppStore((s) => s.notes[item.id]);
  const setNote = useAppStore((s) => s.setNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [report, setReport] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

  const openEditor = () => {
    setDraft(note ?? '');
    setEditing(true);
  };

  return (
    <View style={{ gap: space.sm }}>
      {note ? (
        <Pressable onPress={openEditor} style={[styles.note, { backgroundColor: colors.accentSoft }]} accessibilityLabel="編輯筆記">
          <Ionicons name="pencil" size={15} color={colors.ink} style={{ marginTop: 3 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.inkSoft}>
              我的筆記（點一下修改）
            </AppText>
            <AppText variant="small">{note}</AppText>
          </View>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {!note && <Button title="寫筆記" compact variant="outline" icon="pencil-outline" style={{ flex: 1 }} onPress={openEditor} />}
        <Button
          title="回報問題"
          compact
          variant="ghost"
          icon="flag-outline"
          style={{ flex: 1 }}
          onPress={() => {
            setShareFailed(false);
            setReport(true);
          }}
        />
      </View>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="我的筆記">
        <View style={{ gap: space.md }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            maxLength={2000}
            placeholder="寫下自己的記法、容易混淆的地方…"
            placeholderTextColor={colors.inkMute}
            style={[
              styles.input,
              { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg, fontSize: type.body.fontSize, lineHeight: type.body.lineHeight },
            ]}
          />
          <AppText variant="caption" color={colors.inkMute}>
            筆記只存在這支手機，會出現在這一題的解析下方和「錯題本 → 筆記」。
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {note ? (
              <Button
                title="刪除"
                variant="danger"
                onPress={() => {
                  setNote(item.id, '');
                  setEditing(false);
                }}
              />
            ) : null}
            <Button title="取消" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(false)} />
            <Button
              title="儲存"
              variant="accent"
              style={{ flex: 1 }}
              onPress={() => {
                setNote(item.id, draft);
                setEditing(false);
              }}
            />
          </View>
        </View>
      </Sheet>

      <Sheet visible={report} onClose={() => setReport(false)} title="回報這題有問題">
        <View style={{ gap: space.md }}>
          <AppText variant="small" color={colors.inkSoft}>
            覺得答案、解析或引用的條文有問題嗎？回報時會附上題號和版本，方便查對條文。APP 本身不連網，回報是透過你手機上的其他 APP 送出。
          </AppText>
          <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
            <AppText variant="small" mono selectable style={{ flex: 1 }}>
              {reportText(item)}
            </AppText>
          </View>
          {shareFailed && (
            <AppText variant="caption" color={colors.danger}>
              這個裝置無法開啟分享功能，請長按上面的文字複製後自行傳送。
            </AppText>
          )}
          <Button
            title="用其他 APP 傳送（LINE、Email…）"
            icon="share-outline"
            variant="primary"
            onPress={() => {
              Share.share({ message: reportText(item) }).catch(() => setShareFailed(true));
            }}
          />
          <Button
            title="到 GitHub 回報（需要帳號）"
            icon="logo-github"
            variant="outline"
            onPress={() => {
              const q = `?title=${encodeURIComponent(`題目回報 ${item.id}`)}&body=${encodeURIComponent(reportText(item))}`;
              WebBrowser.openBrowserAsync(ISSUES_URL + q).catch(() => {});
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: space.sm, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' },
  input: { borderWidth: 1, borderRadius: radius.md, padding: space.md, minHeight: 140, textAlignVertical: 'top' },
});
