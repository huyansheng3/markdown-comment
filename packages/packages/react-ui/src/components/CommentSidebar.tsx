/**
 * @comment-md/react-ui - CommentSidebar Component
 * 
 * Sidebar panel for displaying all comments inline
 * No secondary pages - all comments are directly visible
 * Replies can be added directly under each annotation
 */

import React, { useState, type CSSProperties } from 'react';
import { useComments } from '../context/CommentContext';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { CommentThread } from './CommentThread';
import { CommentInput } from './CommentInput';
import type { Annotation } from 'comment-md-core';

/**
 * Props for CommentSidebar
 */
export interface CommentSidebarProps {
  /** Current user name for new comments */
  currentUser?: string;
  /** Width of the sidebar */
  width?: number | string;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
  /** Show all annotations list when none is active */
  showAnnotationsList?: boolean;
  /** Title for the sidebar */
  title?: string;
}

/**
 * Inline annotation card - shows annotation content, comments, and reply input
 */
function AnnotationCard({
  annotation,
  currentUser,
  isActive,
  onActivate,
  onAddComment,
  onResolve,
  onReopen,
  onDelete,
}: {
  annotation: Annotation;
  currentUser: string;
  isActive: boolean;
  onActivate: () => void;
  onAddComment: (content: string) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [showReplyInput, setShowReplyInput] = useState(false);
  
  const isOpen = annotation.status === 'open';
  const accentColor = isOpen ? theme.colors.accentOpen : theme.colors.accentResolved;
  
  return (
    <div
      className={`comment-md-annotation-card ${isActive ? 'active' : ''}`}
      style={{
        backgroundColor: theme.colors.bgTertiary,
        borderRadius: theme.radius.lg,
        border: `1px solid ${isActive ? accentColor : theme.colors.borderSubtle}`,
        overflow: 'hidden',
        transition: `all ${theme.transition.base}`,
        boxShadow: isActive ? `0 0 0 2px ${accentColor}30` : 'none',
      }}
      onClick={(e) => {
        // Only activate when clicking the card background, not buttons/inputs
        if ((e.target as HTMLElement).closest('button, input, textarea')) return;
        onActivate();
      }}
    >
      {/* Header - Referenced content + status */}
      <div
        style={{
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          borderBottom: `1px solid ${theme.colors.borderSubtle}`,
          backgroundColor: isActive ? `${accentColor}08` : 'transparent',
          cursor: 'pointer',
        }}
      >
        {/* Status badge + actions row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[2],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            {/* Status indicator dot */}
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: accentColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: accentColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {isOpen ? t('statusOpen') : t('statusResolved')}
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textMuted,
              }}
            >
              · {annotation.comments.length} {annotation.comments.length === 1 ? t('comment') : t('comments')}
            </span>
          </div>
          
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: theme.spacing[1] }}>
            {isOpen ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve();
                }}
                style={{
                  padding: `2px ${theme.spacing[2]}`,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                  backgroundColor: theme.colors.accentResolvedLight,
                  color: theme.colors.accentResolved,
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  cursor: 'pointer',
                }}
                title={t('resolve')}
              >
                ✓
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReopen();
                }}
                style={{
                  padding: `2px ${theme.spacing[2]}`,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                  backgroundColor: theme.colors.accentOpenLight,
                  color: theme.colors.accentOpenDark,
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  cursor: 'pointer',
                }}
                title={t('reopen')}
              >
                ↻
              </button>
            )}
          </div>
        </div>
        
        {/* Referenced content preview */}
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            lineHeight: theme.typography.lineHeight.normal,
            fontFamily: theme.typography.fontFamilySerif,
            fontStyle: 'italic',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            borderLeft: `2px solid ${theme.colors.borderDefault}`,
            paddingLeft: theme.spacing[3],
          }}
        >
          {annotation.content}
        </div>
      </div>
      
      {/* Comments thread - always visible */}
      <div style={{ padding: `0 ${theme.spacing[4]}` }}>
        <CommentThread comments={annotation.comments} />
      </div>
      
      {/* Reply section */}
      {isOpen && (
        <div
          style={{
            borderTop: `1px solid ${theme.colors.borderSubtle}`,
          }}
        >
          {showReplyInput ? (
            <div style={{ padding: theme.spacing[3] }}>
              <CompactReplyInput
                currentUser={currentUser}
                onSubmit={(content) => {
                  onAddComment(content);
                  setShowReplyInput(false);
                }}
                onCancel={() => setShowReplyInput(false)}
              />
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReplyInput(true);
              }}
              style={{
                width: '100%',
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
                transition: `all ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bgSecondary;
                e.currentTarget.style.color = theme.colors.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textTertiary;
              }}
            >
              💬 {t('addReply')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact reply input for inline replies
 */
function CompactReplyInput({
  currentUser,
  onSubmit,
  onCancel,
}: {
  currentUser: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [content, setContent] = useState('');
  
  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setContent('');
    }
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('replyPlaceholder')}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            onCancel();
          }
        }}
        style={{
          width: '100%',
          padding: theme.spacing[2],
          border: `1px solid ${theme.colors.borderDefault}`,
          borderRadius: theme.radius.md,
          fontSize: theme.typography.fontSize.sm,
          fontFamily: theme.typography.fontFamily,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.bgTertiary,
          resize: 'none',
          minHeight: '60px',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[2] }}>
        <button
          onClick={onCancel}
          style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            fontSize: theme.typography.fontSize.sm,
            backgroundColor: 'transparent',
            color: theme.colors.textTertiary,
            border: `1px solid ${theme.colors.borderSubtle}`,
            borderRadius: theme.radius.md,
            cursor: 'pointer',
          }}
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            backgroundColor: content.trim() ? theme.colors.accentOpen : theme.colors.bgSecondary,
            color: content.trim() ? '#fff' : theme.colors.textMuted,
            border: 'none',
            borderRadius: theme.radius.md,
            cursor: content.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {t('reply')}
        </button>
      </div>
    </div>
  );
}

/**
 * CommentSidebar component
 * 
 * Displays all annotations inline with their comments.
 * No secondary detail page - everything is visible directly.
 * Replies can be added in-place under each annotation.
 */
export function CommentSidebar({
  currentUser = 'user',
  width,
  className = '',
  style = {},
  showAnnotationsList = true,
  title,
}: CommentSidebarProps) {
  const {
    annotations,
    activeAnnotationId,
    setActiveAnnotation,
    addComment,
    resolveThread,
    reopenThread,
    deleteThread,
  } = useComments();
  
  const theme = useTheme();
  const { t } = useI18n();
  
  const openAnnotations = annotations.filter((ann) => ann.status === 'open');
  const resolvedAnnotations = annotations.filter((ann) => ann.status === 'resolved');
  
  const handleAddComment = (annotationId: string, content: string) => {
    addComment(annotationId, {
      by: currentUser,
      content,
    });
  };
  
  const sidebarWidth = width ?? theme.sidebar.width;
  
  const sidebarStyle: CSSProperties = {
    width: sidebarWidth,
    backgroundColor: theme.colors.bgSecondary,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    fontFamily: theme.typography.fontFamily,
    borderLeft: `1px solid ${theme.colors.borderSubtle}`,
    ...style,
  };
  
  const sidebarTitle = title ?? t('sidebarTitle');
  
  return (
    <div className={`comment-md-sidebar ${className}`} style={sidebarStyle}>
      {/* Header */}
      <div
        style={{
          padding: `${theme.spacing[4]} ${theme.spacing[5]}`,
          borderBottom: `1px solid ${theme.colors.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: theme.sidebar.headerHeight,
          backgroundColor: theme.colors.bgTertiary,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            letterSpacing: '-0.01em',
          }}
        >
          {sidebarTitle}
        </h2>
        <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
          {openAnnotations.length > 0 && (
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.accentOpenDark,
                backgroundColor: theme.colors.accentOpenLight,
                padding: '3px 8px',
                borderRadius: '10px',
              }}
            >
              {openAnnotations.length} {t('statusOpen').toLowerCase()}
            </span>
          )}
        </div>
      </div>
      
      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: theme.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        {annotations.length === 0 ? (
          // Empty state
          <div
            style={{
              textAlign: 'center',
              padding: `${theme.spacing[12]} ${theme.spacing[6]}`,
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: theme.colors.bgTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              💬
            </div>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textSecondary,
              }}
            >
              {t('noActiveDiscussion')}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
                lineHeight: theme.typography.lineHeight.normal,
              }}
            >
              {t('selectHighlightedText')}
            </p>
          </div>
        ) : (
          <>
            {/* Open annotations */}
            {openAnnotations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                {openAnnotations.map((ann) => (
                  <AnnotationCard
                    key={ann.id}
                    annotation={ann}
                    currentUser={currentUser}
                    isActive={activeAnnotationId === ann.id}
                    onActivate={() => setActiveAnnotation(activeAnnotationId === ann.id ? null : ann.id)}
                    onAddComment={(content) => handleAddComment(ann.id, content)}
                    onResolve={() => resolveThread(ann.id)}
                    onReopen={() => reopenThread(ann.id)}
                    onDelete={() => {
                      if (confirm(t('deleteConfirm'))) {
                        deleteThread(ann.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Resolved annotations - collapsed section */}
            {resolvedAnnotations.length > 0 && (
              <ResolvedSection
                annotations={resolvedAnnotations}
                currentUser={currentUser}
                activeAnnotationId={activeAnnotationId}
                onActivate={setActiveAnnotation}
                onAddComment={handleAddComment}
                onResolve={resolveThread}
                onReopen={reopenThread}
                onDelete={deleteThread}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsed section for resolved annotations
 */
function ResolvedSection({
  annotations,
  currentUser,
  activeAnnotationId,
  onActivate,
  onAddComment,
  onResolve,
  onReopen,
  onDelete,
}: {
  annotations: Annotation[];
  currentUser: string;
  activeAnnotationId: string | null;
  onActivate: (id: string | null) => void;
  onAddComment: (annotationId: string, content: string) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
          background: 'none',
          border: 'none',
          borderRadius: theme.radius.md,
          cursor: 'pointer',
          color: theme.colors.textTertiary,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          transition: `all ${theme.transition.fast}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▶
          </span>
          {t('resolved')} ({annotations.length})
        </span>
      </button>
      
      {/* Collapsed content */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3], marginTop: theme.spacing[2] }}>
          {annotations.map((ann) => (
            <AnnotationCard
              key={ann.id}
              annotation={ann}
              currentUser={currentUser}
              isActive={activeAnnotationId === ann.id}
              onActivate={() => onActivate(activeAnnotationId === ann.id ? null : ann.id)}
              onAddComment={(content) => onAddComment(ann.id, content)}
              onResolve={() => onResolve(ann.id)}
              onReopen={() => onReopen(ann.id)}
              onDelete={() => onDelete(ann.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentSidebar;
