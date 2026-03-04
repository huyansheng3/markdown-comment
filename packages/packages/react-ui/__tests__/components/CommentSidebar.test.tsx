/**
 * @comment-md/react-ui - CommentSidebar Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CommentSidebar } from '../../src/components/CommentSidebar';
import { CommentProvider } from '../../src/context/CommentContext';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import type { Annotation } from '@comment-md/core';

const mockAnnotation: Annotation = {
  id: 'test-1',
  status: 'open',
  content: 'Test content',
  contentHash: 'hash123',
  position: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 13, offset: 12 },
  },
  comments: [
    { by: 'user', time: '2026-03-01T10:00:00Z', content: 'Test comment' },
  ],
};

const Wrapper = ({ 
  children, 
  annotations = [], 
  activeAnnotationId = null,
  locale = 'en' as const,
}: { 
  children: React.ReactNode;
  annotations?: Annotation[];
  activeAnnotationId?: string | null;
  locale?: 'en' | 'zh-CN' | 'ja';
}) => (
  <I18nProvider locale={locale}>
    <ThemeProvider>
      <CommentProvider 
        annotations={annotations}
        activeAnnotationId={activeAnnotationId}
      >
        {children}
      </CommentProvider>
    </ThemeProvider>
  </I18nProvider>
);

describe('CommentSidebar', () => {
  describe('empty state', () => {
    it('should show empty state when no annotations', () => {
      render(
        <Wrapper>
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('No active discussion')).toBeInTheDocument();
    });

    it('should show Chinese empty state', () => {
      render(
        <Wrapper locale="zh-CN">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('暂无活跃讨论')).toBeInTheDocument();
    });
  });

  describe('annotations list', () => {
    it('should show annotations list when no active annotation', () => {
      render(
        <Wrapper annotations={[mockAnnotation]}>
          <CommentSidebar showAnnotationsList />
        </Wrapper>
      );
      
      // Should show the annotation content preview
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should show comment count', () => {
      render(
        <Wrapper annotations={[mockAnnotation]}>
          <CommentSidebar showAnnotationsList />
        </Wrapper>
      );
      
      expect(screen.getByText(/1.*Comment/i)).toBeInTheDocument();
    });

    it('should show multiple annotations', () => {
      const annotations = [
        mockAnnotation,
        { 
          ...mockAnnotation, 
          id: 'test-2', 
          content: 'Second content',
          comments: [],
        },
      ];
      
      render(
        <Wrapper annotations={annotations}>
          <CommentSidebar showAnnotationsList />
        </Wrapper>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(screen.getByText('Second content')).toBeInTheDocument();
    });
  });

  describe('active annotation', () => {
    it('should show active annotation details', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      // Should show the referenced content
      expect(screen.getByText('Test content')).toBeInTheDocument();
      // Should show the comment
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });

    it('should show status badge for open annotation', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('open')).toBeInTheDocument();
    });

    it('should show status badge for resolved annotation', () => {
      const resolvedAnnotation = { ...mockAnnotation, status: 'resolved' as const };
      
      render(
        <Wrapper annotations={[resolvedAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('resolved')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should show resolve button for open annotation', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    it('should show reopen button for resolved annotation', () => {
      const resolvedAnnotation = { ...mockAnnotation, status: 'resolved' as const };
      
      render(
        <Wrapper annotations={[resolvedAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('Reopen')).toBeInTheDocument();
    });

    it('should show delete button', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show back button', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByTitle('Back to list')).toBeInTheDocument();
    });
  });

  describe('i18n', () => {
    it('should show Chinese action buttons', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1" locale="zh-CN">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('标记解决')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('should show Japanese action buttons', () => {
      render(
        <Wrapper annotations={[mockAnnotation]} activeAnnotationId="test-1" locale="ja">
          <CommentSidebar />
        </Wrapper>
      );
      
      expect(screen.getByText('解決')).toBeInTheDocument();
      expect(screen.getByText('削除')).toBeInTheDocument();
    });
  });

  describe('custom props', () => {
    it('should apply custom title', () => {
      render(
        <Wrapper>
          <CommentSidebar title="Custom Title" />
        </Wrapper>
      );
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Wrapper>
          <CommentSidebar className="custom-sidebar" />
        </Wrapper>
      );
      
      expect(container.querySelector('.custom-sidebar')).toBeInTheDocument();
    });
  });
});
