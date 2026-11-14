import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Divider, IconButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { exportBackup, parseBackup, pickBackupText, type ParsedBackup } from '@/lib/backup';
import { laws, meta } from '@/lib/bank';
import { useAppStore } from '@/lib/store';
import { FONT_SCALES, radius, space, useFontScale, useTheme } from '@/theme';

function Row({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color={colors.inkSoft}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

function fmtBackupTime(iso: string) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '不明';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function About() {
  const { colors } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const reset = useAppStore((s) => s.resetProgress);
  const [confirm, setConfirm] = useState(false);
  const fontScale = useFontScale();
  const importBackup = useAppStore((s) => s.importBackup);
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);

  const doExport = async () => {
    setBusy('export');
    setMsg(null);
    try {
      setMsg({ ok: true, text: await exportBackup() });
    } catch (e) {
      setMsg({ ok: false, text: `匯出失敗：${e instanceof Error ? e.message : '不明原因'}` });
    }
    setBusy(null);
  };
  const doPick = async () => {
    setBusy('import');
    setMsg(null);
    try {
      const text = await pickBackupText();
      if (text != null) setPending(parseBackup(text));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : '讀取備份檔失敗' });
    }
    setBusy(null);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: space.sm }}>
        <AppText variant="title" style={{ flex: 1 }}>
          關於與設定
        </AppText>
        <IconButton icon="close" label="關閉" onPress={() => router.back()} />
      </View>

      <Card style={{ gap: space.lg }}>
        <Row
          icon="shield-checkmark-outline"
          title="每一題都有法規依據"
          body="題目、答案、錯誤選項與解析，都只依據全國法規資料庫的現行條文撰寫，並附上條號與原文摘錄，點選即可看全文。"
        />
        <Row
          icon="git-compare-outline"
          title="兩道核對"
          body="程式逐題比對引用摘錄是否逐字出現在條文中、是否引用到尚未施行的條文；再由未參與出題的審題者逐題確認答案確實由條文推得，不通過的題目一律刪除。"
        />
        <Row
          icon="calendar-outline"
          title={`法規版本：${meta.lawsRetrievedAt}`}
          body={`共 ${laws.length} 部法規，已與全國法規資料庫官方網站逐條比對。已公布但尚未施行的條文不拿來出題。法規之後若再修正，答案可能需要更新。`}
        />
        <Row
          icon="desktop-outline"
          title="電腦化題型"
          body="依技能檢定中心〈乙級術科測試應檢人參考資料〉（試題編號 22200-109204）所列的是非、選擇、配合、填空、排序、連連看、計算題設計；每份模擬 10 題組、100 分鐘、60 分及格。"
        />
      </Card>

      <Card tone="accent" style={{ gap: space.sm }}>
        <AppText variant="smallStrong">重要說明</AppText>
        <AppText variant="small" color={colors.inkSoft}>
          官方術科電腦化試題保密不公開，本 APP 的電腦化題組全部是依法規自行編寫的練習題，並非官方試題。105–109 年舊題照錄官方試卷題目，參考答案由本 APP 依現行法規重新撰寫，與官方或任何補習班的解答無關。本 APP 僅供練習，實際法令解釋以主管機關公告為準。
        </AppText>
      </Card>

      <SectionTitle title="資料來源" />
      <Card padded={false}>
        {[
          ['全國法規資料庫', 'https://law.moj.gov.tw/'],
          ['技能檢定中心 測試參考資料', 'https://www.wdasec.gov.tw/'],
        ].map(([t, u], i) => (
          <Pressable
            key={u}
            onPress={() => WebBrowser.openBrowserAsync(u)}
            style={[styles.link, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <AppText variant="body" style={{ flex: 1 }}>
              {t}
            </AppText>
            <Ionicons name="open-outline" size={18} color={colors.inkMute} />
          </Pressable>
        ))}
      </Card>

      <SectionTitle title="設定" />
      <Card style={{ gap: space.md }}>
        <AppText variant="smallStrong">外觀</AppText>
        <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
          {(
            [
              ['system', '跟隨系統'],
              ['light', '淺色'],
              ['dark', '深色'],
            ] as const
          ).map(([k, l]) => (
            <Pressable
              key={k}
              onPress={() => setSetting('theme', k)}
              style={[styles.segBtn, settings.theme === k && { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <AppText variant="smallStrong" color={settings.theme === k ? colors.ink : colors.inkSoft}>
                {l}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Divider />
        <AppText variant="smallStrong">字體大小</AppText>
        <View style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
          {FONT_SCALES.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => setSetting('fontScale', f.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: fontScale === f.value }}
              style={[styles.segBtn, fontScale === f.value && { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <AppText variant="smallStrong" color={fontScale === f.value ? colors.ink : colors.inkSoft}>
                {f.label}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Divider />
        <Pressable onPress={() => setSetting('haptics', !settings.haptics)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="body" style={{ flex: 1 }}>
            觸感回饋
          </AppText>
          <Ionicons name={settings.haptics ? 'toggle' : 'toggle-outline'} size={36} color={settings.haptics ? colors.success : colors.inkMute} />
        </Pressable>
        <Divider />
        <Button title="清除所有作答紀錄" variant="danger" icon="trash-outline" compact onPress={() => setConfirm(true)} />
      </Card>

      <SectionTitle title="備份與還原" />
      <Card style={{ gap: space.md }}>
        <AppText variant="small" color={colors.inkSoft}>
          作答紀錄、錯題本、收藏和筆記只存在這支手機。換手機或重新安裝前，先匯出一個備份檔（存到雲端硬碟或傳給自己），到新手機再匯入。全程不需要帳號。
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="匯出備份檔" icon="download-outline" variant="primary" compact style={{ flex: 1 }} loading={busy === 'export'} disabled={busy != null} onPress={doExport} />
          <Button title="從備份檔還原" icon="folder-open-outline" variant="outline" compact style={{ flex: 1 }} loading={busy === 'import'} disabled={busy != null} onPress={doPick} />
        </View>
        {msg && (
          <AppText variant="small" color={msg.ok ? colors.success : colors.danger}>
            {msg.text}
          </AppText>
        )}
      </Card>

      <AppText variant="caption" color={colors.inkMute} style={{ textAlign: 'center' }}>
        APP {Constants.expoConfig?.version ?? ''}・題庫 {meta.bankVersion}・{meta.counts.groups} 題組・{meta.counts.items} 子題
      </AppText>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="清除作答紀錄？">
        <View style={{ gap: space.md }}>
          <AppText variant="body" color={colors.inkSoft}>
            錯題本、收藏、成績、速記卡與練習進度都會刪除，無法復原（筆記和設定會保留）。需要的話請先匯出備份檔。
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="取消" variant="outline" style={{ flex: 1 }} onPress={() => setConfirm(false)} />
            <Button
              title="清除"
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => {
                reset();
                setConfirm(false);
              }}
            />
          </View>
        </View>
      </Sheet>

      <Sheet visible={pending != null} onClose={() => setPending(null)} title="用這個備份檔還原？">
        {pending && (
          <View style={{ gap: space.md }}>
            <AppText variant="body" color={colors.inkSoft}>
              備份時間：{fmtBackupTime(pending.exportedAt)}
            </AppText>
            <View style={[styles.summary, { backgroundColor: colors.surfaceAlt }]}>
              <AppText variant="small">
                作答過的子題 {pending.summary.stats} 題・錯題 {pending.summary.wrong} 題・筆記 {pending.summary.notes} 則・收藏 {pending.summary.bookmarks} 個・成績紀錄 {pending.summary.sessions} 筆
              </AppText>
            </View>
            <AppText variant="small" color={colors.danger}>
              還原會取代這支手機上現有的作答紀錄、錯題本、收藏和筆記，無法復原。
            </AppText>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="取消" variant="outline" style={{ flex: 1 }} onPress={() => setPending(null)} />
              <Button
                title="還原"
                variant="accent"
                style={{ flex: 1 }}
                onPress={() => {
                  importBackup(pending.data);
                  setPending(null);
                  setMsg({ ok: true, text: '已還原備份。' });
                }}
              />
            </View>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', padding: space.lg },
  summary: { borderRadius: radius.md, padding: space.md },
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
});
