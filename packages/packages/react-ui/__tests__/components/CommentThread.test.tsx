/**
 * @comment-md/react-ui - CommentThread Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CommentThread } from '../../src/components/CommentThread';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import type { Comment } from '@comment-md/core';

const Wrapper = ({ children, locale = 'en' as const }: { 
  children: React.ReactNode;
  locale?: 'en' | 'zh-CN' | 'ja';
}) => (
  <I18nProvider locale={locale}>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </I18nProvider>
);

const mockComment: Comment = {
  by: 'testuser',
  time: '2026-03-01T10:00:00Z',
  content: 'This is a test comment',
};

describe('CommentThread', () => {
  describe('empty state', () => {
    it('should show empty state when no comments', () => {
      render(
        <Wrapper>
          <CommentThread comments={[]} />
        </Wrapper>
      );
      
      expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Start the conversation/i)).toBeInTheDocument();
    });

    it('should show Chinese empty state with zh-CN locale', () => {
      render(
        <Wrapper locale="zh-CN">
          <CommentThread comments={[]} />
        </Wrapper>
      );
      
      // The text is split across elements, use a regex pattern
      expect(screen.getByText(/暂无评论/)).toBeInTheDocument();
    });
  });

  describe('comment rendering', () => {
    it('should render single comment', () => {
      render(
        <Wrapper>
          <CommentThread comments={[mockComment]} />
        </Wrapper>
      );
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });

    it('should render multiple comments', () => {
      const comments: Comment[] = [
        mockComment,
        { by: 'user2', time: '2026-03-01T10:05:00Z', content: 'Second comment' },
        { by: 'user3', time: '2026-03-01T10:10:00Z', content: 'Third comment' },
      ];
      
      render(
        <Wrapper>
          <CommentThread comments={comments} />
        </Wrapper>
      );
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('user3')).toBeInTheDocument();
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
      expect(screen.getByText('Third comment')).toBeInTheDocument();
    });
  });

  describe('AI comments', () => {
    it('should show AI label for AI comments', () => {
      const aiComment: Comment = {
        by: 'ai',
        time: '2026-03-01T10:00:00Z',
        content: 'AI generated response',
      };
      
      render(
        <Wrapper>
          <CommentThread comments={[aiComment]} />
        </Wrapper>
      );
      
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('should show AI label for system comments', () => {
      const systemComment: Comment = {
        by: 'system',
        time: '2026-03-01T10:00:00Z',
        content: 'System message',
      };
      
      render(
        <Wrapper>
          <CommentThread comments={[systemComment]} />
        </Wrapper>
      );
      
      expect(screen.getByText('AI')).toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    it('should format recent time as "just now"', () => {
      const recentComment: Comment = {
        by: 'user',
        time: new Date().toISOString(),
        content: 'Recent comment',
      };
      
      render(
        <Wrapper>
          <CommentThread comments={[recentComment]} />
        </Wrapper>
      );
      
      expect(screen.getByText('just now')).toBeInTheDocument();
    });
  });

  describe('avatar', () => {
    it('should show user initial in avatar', () => {
      render(
        <Wrapper>
          <CommentThread comments={[mockComment]} />
        </Wrapper>
      );
      
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of 'testuser'
    });

    it('should show special avatar for AI', () => {
      const aiComment: Comment = {
        by: 'ai',
        time: '2026-03-01T10:00:00Z',
        content: 'AI comment',
      };
      
      render(
        <Wrapper>
          <CommentThread comments={[aiComment]} />
        </Wrapper>
      );
      
      expect(screen.getByText('✨')).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Wrapper>
          <CommentThread comments={[mockComment]} className="custom-thread" />
        </Wrapper>
      );
      
      expect(container.querySelector('.custom-thread')).toBeInTheDocument();
    });
  });
});
