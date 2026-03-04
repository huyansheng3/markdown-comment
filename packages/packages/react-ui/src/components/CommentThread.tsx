/**
 * @comment-md/react-ui - CommentThread Component
 * 
 * Renders a thread of comments for an annotation
 * Uses theme and i18n systems
 */

import React, { type CSSProperties } from 'react';
import type { Comment } from 'comment-md-core';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

/**
 * Props for CommentThread
 */
export interface CommentThreadProps {
  /** List of comments */
  comments: Comment[];
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
}

/**
 * Props for a single comment item
 */
interface CommentItemProps {
  comment: Comment;
  isLast: boolean;
}

/**
 * Format timestamp for display with i18n support
 */
function useFormatTime() {
  const { t } = useI18n();
  
  return (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return t('justNow');
      if (diffMins < 60) return t('minutesAgo', { count: diffMins });
      if (diffHours < 24) return t('hoursAgo', { count: diffHours });
      if (diffDays < 7) return t('daysAgo', { count: diffDays });
      
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };
}

/**
 * Get avatar style based on author type
 */
function getAvatarStyle(name: string, theme: ReturnType<typeof useTheme>): { bg: string; fg: string; letter: string } {
  const isAI = name.toLowerCase() === 'ai' || name.toLowerCase() === 'system';
  
  if (isAI) {
    return {
      bg: `linear-gradient(135deg, ${theme.colors.accentAi} 0%, #8b5cf6 100%)`,
      fg: '#ffffff',
      letter: '✨',
    };
  }
  
  // Human users get warm colors
  const warmColors = [
    { bg: `linear-gradient(135deg, ${theme.colors.accentOpen} 0%, #f97316 100%)`, fg: '#fff' },
    { bg: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', fg: '#fff' },
    { bg: `linear-gradient(135deg, #14b8a6 0%, ${theme.colors.accentResolved} 100%)`, fg: '#fff' },
    { bg: `linear-gradient(135deg, ${theme.colors.accentPrimary} 0%, ${theme.colors.accentAi} 100%)`, fg: '#fff' },
    { bg: `linear-gradient(135deg, ${theme.colors.accentAi} 0%, #a855f7 100%)`, fg: '#fff' },
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorSet = warmColors[Math.abs(hash) % warmColors.length];
  return {
    ...colorSet,
    letter: name.charAt(0).toUpperCase(),
  };
}

/**
 * Single comment item
 */
function CommentItem({ comment, isLast }: CommentItemProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const formatTime = useFormatTime();
  
  const isAI = comment.by.toLowerCase() === 'ai' || comment.by.toLowerCase() === 'system';
  const avatarStyle = getAvatarStyle(comment.by, theme);
  
  return (
    <div
      className="comment-md-comment-item"
      style={{
        display: 'flex',
        gap: theme.spacing[3],
        padding: `${theme.spacing[4]} 0`,
        borderBottom: isLast ? 'none' : `1px solid ${theme.colors.borderSubtle}`,
      }}
    >
      {/* Avatar */}
      <div
        className="comment-md-avatar"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: theme.radius.lg,
          background: avatarStyle.bg,
          color: avatarStyle.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isAI ? theme.typography.fontSize.lg : theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          flexShrink: 0,
          boxShadow: theme.shadow.sm,
        }}
      >
        {avatarStyle.letter}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[1],
          }}
        >
          <span
            style={{
              fontWeight: theme.typography.fontWeight.semibold,
              fontSize: theme.typography.fontSize.sm,
              color: isAI ? theme.colors.accentAi : theme.colors.textPrimary,
            }}
          >
            {comment.by}
          </span>
          {isAI && (
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                padding: '2px 6px',
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.accentAiLight,
                color: theme.colors.accentAi,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              {t('aiLabel')}
            </span>
          )}
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textMuted,
              marginLeft: 'auto',
            }}
          >
            {formatTime(comment.time)}
          </span>
        </div>
        
        {/* Comment body */}
        <div
          className="comment-md-comment-body"
          style={{
            fontSize: theme.typography.fontSize.base,
            lineHeight: theme.typography.lineHeight.relaxed,
            color: theme.colors.textSecondary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {comment.content}
        </div>
      </div>
    </div>
  );
}

/**
 * CommentThread component
 * 
 * Renders a list of comments in a thread format
 */
export function CommentThread({
  comments,
  className = '',
  style = {},
}: CommentThreadProps) {
  const theme = useTheme();
  const { t } = useI18n();
  
  if (comments.length === 0) {
    return (
      <div
        className={`comment-md-thread empty ${className}`}
        style={{
          padding: `${theme.spacing[8]} ${theme.spacing[4]}`,
          textAlign: 'center',
          ...style,
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            borderRadius: '50%',
            backgroundColor: theme.colors.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}
        >
          🗨️
        </div>
        <p
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary,
          }}
        >
          {t('noCommentsYet')} {t('startConversation')}
        </p>
      </div>
    );
  }
  
  return (
    <div
      className={`comment-md-thread ${className}`}
      style={{
        ...style,
      }}
    >
      {comments.map((comment, index) => (
        <CommentItem
          key={`${comment.by}-${comment.time}-${index}`}
          comment={comment}
          isLast={index === comments.length - 1}
        />
      ))}
    </div>
  );
}

export default CommentThread;
