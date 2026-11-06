export type Citation = {
  pcode: string;
  article: string;
  quote: string;
};

export type Option = { id: string; text: string };

type ItemBase = {
  id: string;
  points: number;
  stem: string;
  explanation: string;
  citations: Citation[];
  /** 官方舊題：說明現行法與出題當時不同之處 */
  lawChangeNote?: string;
  /** 不是法規題（例如純計算原理）時，說明依據 */
  basisNote?: string;
};

export type TrueFalseItem = ItemBase & { type: 'truefalse'; answer: boolean };
export type SingleItem = ItemBase & { type: 'single'; options: Option[]; answer: string };
export type MultiItem = ItemBase & { type: 'multi'; options: Option[]; answer: string[] };
export type MatchingItem = ItemBase & {
  type: 'matching';
  options: Option[];
  blanks: { id: string; label: string }[];
  answer: Record<string, string>;
};
export type FillItem = ItemBase & {
  type: 'fill';
  blanks: { id: string; unit?: string }[];
  answer: Record<string, number>;
  tolerance?: number;
  steps?: string[];
};
export type OrderingItem = ItemBase & {
  type: 'ordering';
  options: Option[];
  answer: string[];
  orderHint?: string;
};
export type LinkingItem = ItemBase & {
  type: 'linking';
  left: Option[];
  columns: { title: string; options: Option[] }[];
  answer: Record<string, string[]>;
};
export type CalcItem = ItemBase & {
  type: 'calc';
  answer: number;
  unit: string;
  tolerance: number;
  decimals?: number;
  steps: string[];
};
export type EssayItem = ItemBase & {
  type: 'essay';
  /** 參考答案要點（依現行法規撰寫） */
  modelAnswer: string[];
};

export type Item =
  | TrueFalseItem
  | SingleItem
  | MultiItem
  | MatchingItem
  | FillItem
  | OrderingItem
  | LinkingItem
  | CalcItem
  | EssayItem;

export type ItemType = Item['type'];

export type Group = {
  id: string;
  source: 'self' | 'official-old';
  category: 1 | 2 | 3;
  topic: string;
  title: string;
  context?: string;
  items: Item[];
  /** 官方舊題 */
  session?: string;
  no?: number;
  originalText?: string;
  hasFigure?: boolean;
  figureNote?: string;
  /** 官方舊題中因缺乏法規依據而未收錄的小題 */
  partial?: boolean;
  omittedParts?: { part: string; reason: string }[] | string[];
};

export type LawArticle = { no: string; text: string; chapter: string; pending?: boolean };
export type Law = {
  pcode: string;
  name: string;
  modified: string;
  effectiveNote?: string;
  url: string;
  articles: LawArticle[];
};

/** 使用者作答值，依題型而異 */
export type AnswerValue =
  | { type: 'truefalse'; value: boolean | null }
  | { type: 'single'; value: string | null }
  | { type: 'multi'; value: string[] }
  | { type: 'matching'; value: Record<string, string> }
  | { type: 'fill'; value: Record<string, string> }
  | { type: 'ordering'; value: string[] }
  | { type: 'linking'; value: Record<string, (string | null)[]> }
  | { type: 'calc'; value: string }
  | { type: 'essay'; value: 'know' | 'unsure' | null };

export const typeLabel: Record<ItemType, string> = {
  truefalse: '是非題',
  single: '單選題',
  multi: '複選題',
  matching: '配合題',
  fill: '填空題',
  ordering: '排序題',
  linking: '連連看',
  calc: '計算題',
  essay: '問答題',
};
