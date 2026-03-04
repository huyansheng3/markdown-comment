/**
 * @comment-md/react-ui - SelectionHandler Component
 * 
 * Handles text selection and image clicks, provides UI for creating annotations
 * Uses theme and i18n systems
 */

import React, { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useComments } from '../context/CommentContext';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { generateId } from '@comment-md/core';

/**
 * Props for SelectionHandler
 */
export interface SelectionHandlerProps {
  /** Container element to monitor for selections */
  containerRef: React.RefObject<HTMLElement>;
  /** Current user for new comments */
  currentUser?: string;
  /** Callback when a new annotation is created */
  onCreateAnnotation?: (annotation: {
    id: string;
    content: string;
    comment: { by: string; content: string };
  }) => void;
  /** Enable/disable selection handling */
  enabled?: boolean;
}

interface SelectionInfo {
  text: string;
  range?: Range;
  rect: DOMRect;
  type: 'text' | 'image';
  element?: HTMLElement;
}

/**
 * SelectionHandler component
 * 
 * Monitors text selection and image clicks, shows a floating button to add comments
 */
export function SelectionHandler({
  containerRef,
  currentUser = 'user',
  onCreateAnnotation,
  enabled = true,
}: SelectionHandlerProps) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isInteracting, setIsInteracting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const theme = useTheme();
  const { t } = useI18n();
  
  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    if (isInteracting || showCommentInput) return;
    if (!enabled || !containerRef.current) return;
    
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      // Don't clear if we have an image selection
      if (selection?.type !== 'image') {
        setSelection(null);
      }
      return;
    }
    
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    
    // Check if selection is within our container
    const container = containerRef.current;
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    
    if (text.length === 0) {
      setSelection(null);
      return;
    }
    
    const rect = range.getBoundingClientRect();
    
    setSelection({
      text,
      range: range.cloneRange(),
      rect,
      type: 'text',
    });
  }, [enabled, containerRef, isInteracting, showCommentInput, selection?.type]);
  
  // Handle image click
  const handleImageClick = useCallback((e: MouseEvent) => {
    if (!enabled || !containerRef.current) return;
    
    const target = e.target as HTMLElement;
    
    // Check if clicked element is an image within our container
    if (target.tagName === 'IMG' && containerRef.current.contains(target)) {
      e.preventDefault();
      e.stopPropagation();
      
      const img = target as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      
      // Use alt text or a default description
      const text = img.alt || img.title || '[图片]';
      
      setSelection({
        text,
        rect,
        type: 'image',
        element: img,
      });
      
      // Clear text selection
      window.getSelection()?.removeAllRanges();
    }
  }, [enabled, containerRef]);
  
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('click', handleImageClick, true);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('click', handleImageClick, true);
    };
  }, [handleSelectionChange, handleImageClick]);
  
  const handleAddComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInteracting(true);
    setShowCommentInput(true);
    
    setTimeout(() => {
      inputRef.current?.focus();
      setIsInteracting(false);
    }, 200);
  };
  
  const handleSubmitComment = () => {
    if (!selection || !commentText.trim()) return;
    
    const annotationId = generateId();
    
    onCreateAnnotation?.({
      id: annotationId,
      content: selection.text,
      comment: {
        by: currentUser,
        content: commentText.trim(),
      },
    });
    
    setSelection(null);
    setShowCommentInput(false);
    setCommentText('');
    setIsInteracting(false);
    
    window.getSelection()?.removeAllRanges();
  };
  
  const handleCancel = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setShowCommentInput(false);
    setCommentText('');
    setIsInteracting(false);
    
    // Don't clear selection immediately for image to allow re-commenting
    if (selection?.type !== 'image') {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };
  
  if (!selection && !showCommentInput) return null;
  
  const getOptimalPosition = () => {
    if (!selection) {
      return { left: 200, top: 100, placement: 'below' as const };
    }
    
    const PADDING = 12;
    const POPUP_HEIGHT = 250;
    const POPUP_WIDTH = 350;
    const BUTTON_HEIGHT = 40;
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const sel = selection.rect;
    
    let left = sel.left + (sel.width / 2) - (POPUP_WIDTH / 2);
    left = Math.max(PADDING, Math.min(left, viewportWidth - POPUP_WIDTH - PADDING));
    
    const spaceBelow = viewportHeight - sel.bottom - PADDING;
    const spaceAbove = sel.top - PADDING;
    
    let top: number;
    let placement: 'above' | 'below';
    
    if (spaceBelow >= POPUP_HEIGHT || spaceBelow >= spaceAbove) {
      placement = 'below';
      top = sel.bottom + PADDING;
      
      if (top + POPUP_HEIGHT > viewportHeight - PADDING) {
        placement = 'above';
        top = sel.top - POPUP_HEIGHT - PADDING;
      }
    } else {
      placement = 'above';
      top = sel.top - POPUP_HEIGHT - PADDING;
      
      if (top < PADDING) {
        placement = 'below';
        top = sel.bottom + PADDING;
      }
    }
    
    let buttonTop: number;
    let buttonLeft: number;
    
    if (placement === 'below') {
      buttonTop = sel.top - BUTTON_HEIGHT - 8;
    } else {
      buttonTop = sel.bottom + 8;
    }
    buttonLeft = sel.left + (sel.width / 2) - 50;
    
    return { left, top, buttonTop, buttonLeft, placement };
  };
  
  const position = getOptimalPosition();
  
  const buttonStyle: CSSProperties = {
    position: 'fixed',
    left: position.buttonLeft,
    top: position.buttonTop,
    zIndex: 9999,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    backgroundColor: theme.colors.accentPrimary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.radius.lg,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    fontFamily: theme.typography.fontFamily,
    cursor: 'pointer',
    boxShadow: theme.shadow.lg,
    transition: `all ${theme.transition.fast}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
  };
  
  const inputContainerStyle: CSSProperties = {
    position: 'fixed',
    left: position.left,
    top: position.top,
    zIndex: 9999,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.borderDefault}`,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    boxShadow: theme.shadow.xl,
    minWidth: '320px',
    maxWidth: '400px',
    fontFamily: theme.typography.fontFamily,
  };
  
  return (
    <>
      {/* Add Comment Button */}
      {selection && !showCommentInput && (
        <button
          ref={buttonRef}
          style={buttonStyle}
          onClick={handleAddComment}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span>💬</span>
          <span>{t('addCommentButton')}</span>
        </button>
      )}
      
      {/* Comment Input Popup */}
      {showCommentInput && selection && (
        <div 
          style={inputContainerStyle}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Selected text/image preview */}
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary,
              marginBottom: theme.spacing[3],
              padding: theme.spacing[3],
              backgroundColor: theme.colors.bgSecondary,
              borderRadius: theme.radius.md,
              maxHeight: '80px',
              overflow: 'auto',
            }}
          >
            <div style={{ fontWeight: theme.typography.fontWeight.medium, marginBottom: theme.spacing[1] }}>
              {selection.type === 'image' ? '🖼️ 选中图片' : t('selectedText')}
            </div>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              color: theme.colors.textSecondary,
              fontStyle: 'italic',
            }}>
              {selection.text}
            </div>
          </div>
          
          {/* Comment input */}
          <textarea
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={t('commentPlaceholder')}
            rows={3}
            style={{
              width: '100%',
              padding: theme.spacing[3],
              border: `1px solid ${theme.colors.borderDefault}`,
              borderRadius: theme.radius.md,
              fontSize: theme.typography.fontSize.base,
              fontFamily: theme.typography.fontFamily,
              resize: 'vertical',
              marginBottom: theme.spacing[3],
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.accentPrimary;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accentPrimaryLight}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.borderDefault;
              e.currentTarget.style.boxShadow = 'none';
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitComment();
              }
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
          
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textMuted }}>
              ⌘ + ↵ {t('pressToSubmit')}
            </span>
            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
              <button
                onClick={handleCancel}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: 'transparent',
                  color: theme.colors.textTertiary,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily,
                  cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmitComment}
                onMouseDown={(e) => e.preventDefault()}
                disabled={!commentText.trim()}
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[4]}`,
                  backgroundColor: commentText.trim() ? theme.colors.accentPrimary : theme.colors.bgSecondary,
                  color: commentText.trim() ? '#fff' : theme.colors.textMuted,
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  fontFamily: theme.typography.fontFamily,
                  cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {t('addCommentButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SelectionHandler;
