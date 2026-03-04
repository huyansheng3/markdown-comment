/**
 * @comment-md/react-ui - I18N System
 * 
 * Internationalization support for all components
 */

import React, { createContext, useContext, type ReactNode } from 'react';

/**
 * All translatable strings
 */
export interface I18nStrings {
  // General
  comments: string;
  comment: string;
  cancel: string;
  delete: string;
  confirm: string;
  reply: string;
  resolved: string;
  
  // Sidebar
  sidebarTitle: string;
  openThreads: string;
  openThread: string;
  noActiveDiscussion: string;
  selectHighlightedText: string;
  noOpenThreads: string;
  referencedContent: string;
  
  // Status
  statusOpen: string;
  statusResolved: string;
  
  // Actions
  resolve: string;
  reopen: string;
  deleteThread: string;
  deleteConfirm: string;
  backToList: string;
  
  // Comment input
  addComment: string;
  addReply: string;
  replyPlaceholder: string;
  commentPlaceholder: string;
  commentingAs: string;
  pressToSubmit: string;
  sending: string;
  
  // Comment thread
  noCommentsYet: string;
  startConversation: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  
  // Selection handler
  addCommentButton: string;
  selectedText: string;
  
  // Badges
  aiLabel: string;
}

/**
 * English translations (default)
 */
export const enStrings: I18nStrings = {
  // General
  comments: 'Comments',
  comment: 'Comment',
  cancel: 'Cancel',
  delete: 'Delete',
  confirm: 'Confirm',
  reply: 'Reply',
  resolved: 'Resolved',
  
  // Sidebar
  sidebarTitle: 'Comments',
  openThreads: '{count} open threads',
  openThread: '{count} open thread',
  noActiveDiscussion: 'No active discussion',
  selectHighlightedText: 'Select highlighted text or click on an annotation to view comments',
  noOpenThreads: 'No open threads',
  referencedContent: 'Referenced content',
  
  // Status
  statusOpen: 'open',
  statusResolved: 'resolved',
  
  // Actions
  resolve: 'Resolve',
  reopen: 'Reopen',
  deleteThread: 'Delete',
  deleteConfirm: 'Delete this thread?',
  backToList: 'Back to list',
  
  // Comment input
  addComment: 'Add a comment...',
  addReply: 'Add a reply...',
  replyPlaceholder: 'Write a reply...',
  commentPlaceholder: 'Add a comment...',
  commentingAs: 'Commenting as',
  pressToSubmit: 'to submit',
  sending: 'Sending...',
  
  // Comment thread
  noCommentsYet: 'No comments yet.',
  startConversation: 'Start the conversation!',
  justNow: 'just now',
  minutesAgo: '{count}m ago',
  hoursAgo: '{count}h ago',
  daysAgo: '{count}d ago',
  
  // Selection handler
  addCommentButton: 'Comment',
  selectedText: 'Selected text:',
  
  // Badges
  aiLabel: 'AI',
};

/**
 * Chinese (Simplified) translations
 */
export const zhCNStrings: I18nStrings = {
  // General
  comments: '评论',
  comment: '评论',
  cancel: '取消',
  delete: '删除',
  confirm: '确认',
  reply: '回复',
  resolved: '已解决',
  
  // Sidebar
  sidebarTitle: '评论',
  openThreads: '{count} 个讨论',
  openThread: '{count} 个讨论',
  noActiveDiscussion: '暂无活跃讨论',
  selectHighlightedText: '选中高亮内容或点击批注查看评论',
  noOpenThreads: '暂无讨论',
  referencedContent: '引用内容',
  
  // Status
  statusOpen: '进行中',
  statusResolved: '已解决',
  
  // Actions
  resolve: '标记解决',
  reopen: '重新打开',
  deleteThread: '删除',
  deleteConfirm: '确定删除此讨论？',
  backToList: '返回列表',
  
  // Comment input
  addComment: '添加评论...',
  addReply: '添加回复...',
  replyPlaceholder: '写下你的回复...',
  commentPlaceholder: '添加评论...',
  commentingAs: '以',
  pressToSubmit: '发送',
  sending: '发送中...',
  
  // Comment thread
  noCommentsYet: '暂无评论',
  startConversation: '开始讨论吧！',
  justNow: '刚刚',
  minutesAgo: '{count}分钟前',
  hoursAgo: '{count}小时前',
  daysAgo: '{count}天前',
  
  // Selection handler
  addCommentButton: '评论',
  selectedText: '选中内容：',
  
  // Badges
  aiLabel: 'AI',
};

/**
 * Japanese translations
 */
export const jaStrings: I18nStrings = {
  // General
  comments: 'コメント',
  comment: 'コメント',
  cancel: 'キャンセル',
  delete: '削除',
  confirm: '確認',
  reply: '返信',
  resolved: '解決済み',
  
  // Sidebar
  sidebarTitle: 'コメント',
  openThreads: '{count} 件のスレッド',
  openThread: '{count} 件のスレッド',
  noActiveDiscussion: 'アクティブな議論はありません',
  selectHighlightedText: 'ハイライトされたテキストを選択するか、注釈をクリックしてコメントを表示',
  noOpenThreads: 'スレッドがありません',
  referencedContent: '参照コンテンツ',
  
  // Status
  statusOpen: 'オープン',
  statusResolved: '解決済み',
  
  // Actions
  resolve: '解決',
  reopen: '再オープン',
  deleteThread: '削除',
  deleteConfirm: 'このスレッドを削除しますか？',
  backToList: 'リストに戻る',
  
  // Comment input
  addComment: 'コメントを追加...',
  addReply: '返信を追加...',
  replyPlaceholder: '返信を書く...',
  commentPlaceholder: 'コメントを追加...',
  commentingAs: '投稿者',
  pressToSubmit: '送信',
  sending: '送信中...',
  
  // Comment thread
  noCommentsYet: 'コメントはまだありません',
  startConversation: '会話を始めましょう！',
  justNow: 'たった今',
  minutesAgo: '{count}分前',
  hoursAgo: '{count}時間前',
  daysAgo: '{count}日前',
  
  // Selection handler
  addCommentButton: 'コメント',
  selectedText: '選択テキスト：',
  
  // Badges
  aiLabel: 'AI',
};

/**
 * All available locales
 */
export const locales = {
  en: enStrings,
  'zh-CN': zhCNStrings,
  ja: jaStrings,
} as const;

export type Locale = keyof typeof locales;

/**
 * I18n context value
 */
export interface I18nContextValue {
  locale: Locale;
  strings: I18nStrings;
  t: (key: keyof I18nStrings, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Props for I18nProvider
 */
export interface I18nProviderProps {
  /** Initial locale */
  locale?: Locale;
  /** Custom translations (will override built-in) */
  customStrings?: Partial<I18nStrings>;
  /** Children */
  children: ReactNode;
}

/**
 * I18nProvider component
 * 
 * Provides internationalization context to all child components
 */
export function I18nProvider({
  locale: initialLocale = 'en',
  customStrings,
  children,
}: I18nProviderProps) {
  const [locale, setLocale] = React.useState<Locale>(initialLocale);
  
  const strings = React.useMemo(() => {
    const baseStrings = locales[locale];
    return customStrings ? { ...baseStrings, ...customStrings } : baseStrings;
  }, [locale, customStrings]);
  
  const t = React.useCallback(
    (key: keyof I18nStrings, params?: Record<string, string | number>) => {
      let str = strings[key] || key;
      
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      
      return str;
    },
    [strings]
  );
  
  const value: I18nContextValue = {
    locale,
    strings,
    t,
    setLocale,
  };
  
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access i18n context
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  
  if (!context) {
    // Return default English if not wrapped in provider
    return {
      locale: 'en',
      strings: enStrings,
      t: (key, params) => {
        let str = enStrings[key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            str = str.replace(`{${k}}`, String(v));
          });
        }
        return str;
      },
      setLocale: () => {},
    };
  }
  
  return context;
}

export default I18nProvider;
