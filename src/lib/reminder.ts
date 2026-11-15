import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { getItem } from './bank';
import { useAppStore } from './store';

/**
 * 每日複習提醒：手機本機排程的通知，不連網、不需要帳號。
 * 每次打開 APP、作答或改設定時，重新排好接下來 7 天的提醒；通知內容依當天會到期的錯題數寫好。
 */
export const reminderSupported = Platform.OS === 'android' || Platform.OS === 'ios';

const CHANNEL = 'daily-review';
const DAYS = 7;
export const DEFAULT_REMINDER_TIME = '20:00';

if (reminderSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** 問使用者要不要允許通知；回傳是否已允許 */
export async function askReminderPermission(): Promise<boolean> {
  if (!reminderSupported) return false;
  if (Platform.OS === 'android') {
    // eslint-disable-next-line import/namespace -- AndroidImportance 由 expo-notifications 的型別檔再匯出，lint 解析不到
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: '每日複習提醒', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export function parseTime(t?: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  const h = m ? Math.min(23, Math.max(0, Number(m[1]))) : 20;
  const mm = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  return { h, m: mm };
}

export const fmtTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** 依目前的錯題排程，重新排好接下來 7 天的提醒 */
export async function rescheduleReminders(appName: string) {
  if (!reminderSupported) return;
  const st = useAppStore.getState();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!st.settings.reminderOn) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  const { h, m } = parseTime(st.settings.reminderTime);
  const goal = st.settings.dailyGoal ?? 20;
  const now = Date.now();
  const wrongIds = Object.keys(st.wrong).filter((id) => getItem(id));
  for (let d = 0; d < DAYS; d++) {
    const at = new Date();
    at.setDate(at.getDate() + d);
    at.setHours(h, m, 0, 0);
    if (at.getTime() <= now + 60000) continue;
    const endOfDay = new Date(at);
    endOfDay.setHours(23, 59, 59, 999);
    const due = wrongIds.filter((id) => (st.srs[id]?.due ?? 0) <= endOfDay.getTime()).length;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${appName}・今天的複習`,
        body: due > 0 ? `有 ${due} 題錯題今天到期，記得複習；每日目標 ${goal} 題。` : `今天沒有到期的錯題，練幾題保持手感；每日目標 ${goal} 題。`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

/** 放在根版面：設定、錯題排程有變動時，重新排提醒 */
export function useReminderSync(appName: string) {
  const on = useAppStore((s) => !!s.settings.reminderOn);
  const time = useAppStore((s) => s.settings.reminderTime);
  const goal = useAppStore((s) => s.settings.dailyGoal);
  const srs = useAppStore((s) => s.srs);
  const wrong = useAppStore((s) => s.wrong);
  useEffect(() => {
    if (!reminderSupported) return;
    const t = setTimeout(() => {
      rescheduleReminders(appName).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [on, time, goal, srs, wrong, appName]);
}
