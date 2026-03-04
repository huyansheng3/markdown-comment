/**
 * @comment-md/react-ui - CommentInput Component
 * 
 * Input component for adding new comments
 * Uses theme and i18n systems
 */

import React, { useState, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

/**
 * Props for CommentInput
 */
export interface CommentInputProps {
  /** Annotation ID to add comment to */
  annotationId: string;
  /** Current user name */
  currentUser?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Callback when comment is submitted */
  onSubmit: (annotationId: string, content: string) => void;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
  /** Auto focus the input */
  autoFocus?: boolean;
}

/**
 * CommentInput component
 * 
 * Text area for entering new comments with submit button
 */
export function CommentInput({
  annotationId,
  currentUser = 'user',
  placeholder,
  onSubmit,
  className = '',
  style = {},
  autoFocus = false,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const theme = useTheme();
  const { t } = useI18n();
  
  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      onSubmit(annotationId, trimmedContent);
      setContent('');
      textareaRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const hasContent = content.trim().length > 0;
  const inputPlaceholder = placeholder ?? t('commentPlaceholder');
  
  return (
    <div
      className={`comment-md-input ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
        padding: theme.spacing[4],
        borderTop: `1px solid ${theme.colors.borderSubtle}`,
        backgroundColor: theme.colors.bgTertiary,
        ...style,
      }}
    >
      {/* User indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: theme.radius.md,
            background: `linear-gradient(135deg, ${theme.colors.accentOpen} 0%, #f97316 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: '#fff',
          }}
        >
          {currentUser.charAt(0).toUpperCase()}
        </div>
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary,
          }}
        >
          {currentUser}
        </span>
      </div>
      
      {/* Textarea */}
      <div
        style={{
          position: 'relative',
          borderRadius: theme.radius.lg,
          border: `1px solid ${isFocused ? theme.colors.accentOpen : theme.colors.borderDefault}`,
          backgroundColor: theme.colors.bgTertiary,
          transition: `all ${theme.transition.fast}`,
          boxShadow: isFocused ? `0 0 0 3px ${theme.colors.accentOpen}20` : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={inputPlaceholder}
          autoFocus={autoFocus}
          disabled={isSubmitting}
          rows={3}
          style={{
            width: '100%',
            padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
            border: 'none',
            borderRadius: theme.radius.lg,
            fontSize: theme.typography.fontSize.base,
            lineHeight: theme.typography.lineHeight.relaxed,
            resize: 'none',
            minHeight: '80px',
            fontFamily: theme.typography.fontFamily,
            color: theme.colors.textPrimary,
            backgroundColor: 'transparent',
            outline: 'none',
          }}
        />
      </div>
      
      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <kbd
            style={{
              display: 'inline-block',
              padding: '2px 5px',
              fontSize: '10px',
              fontFamily: theme.typography.fontFamilyMono,
              backgroundColor: theme.colors.bgSecondary,
              borderRadius: '3px',
              border: `1px solid ${theme.colors.borderSubtle}`,
            }}
          >
            ⌘
          </kbd>
          <kbd
            style={{
              display: 'inline-block',
              padding: '2px 5px',
              fontSize: '10px',
              fontFamily: theme.typography.fontFamilyMono,
              backgroundColor: theme.colors.bgSecondary,
              borderRadius: '3px',
              border: `1px solid ${theme.colors.borderSubtle}`,
            }}
          >
            ↵
          </kbd>
          <span style={{ marginLeft: '4px' }}>{t('pressToSubmit')}</span>
        </span>
        
        <button
          onClick={handleSubmit}
          disabled={!hasContent || isSubmitting}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
            backgroundColor: hasContent ? theme.colors.accentOpen : theme.colors.bgSecondary,
            color: hasContent ? '#fff' : theme.colors.textMuted,
            border: 'none',
            borderRadius: theme.radius.md,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: hasContent ? 'pointer' : 'not-allowed',
            transition: `all ${theme.transition.fast}`,
            boxShadow: hasContent ? theme.shadow.sm : 'none',
          }}
        >
          {isSubmitting ? t('sending') : t('comment')}
        </button>
      </div>
    </div>
  );
}

export default CommentInput;
