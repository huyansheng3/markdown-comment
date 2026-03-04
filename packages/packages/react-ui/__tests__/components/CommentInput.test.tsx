/**
 * @comment-md/react-ui - CommentInput Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CommentInput } from '../../src/components/CommentInput';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { I18nProvider } from '../../src/i18n/I18nProvider';

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

describe('CommentInput', () => {
  describe('rendering', () => {
    it('should render textarea', () => {
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={() => {}} />
        </Wrapper>
      );
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show placeholder', () => {
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={() => {}} />
        </Wrapper>
      );
      
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('should show Chinese placeholder', () => {
      render(
        <Wrapper locale="zh-CN">
          <CommentInput annotationId="test-1" onSubmit={() => {}} />
        </Wrapper>
      );
      
      expect(screen.getByPlaceholderText('添加评论...')).toBeInTheDocument();
    });

    it('should show custom placeholder', () => {
      render(
        <Wrapper>
          <CommentInput 
            annotationId="test-1" 
            onSubmit={() => {}} 
            placeholder="Custom placeholder"
          />
        </Wrapper>
      );
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });
  });

  describe('user display', () => {
    it('should show current user', () => {
      render(
        <Wrapper>
          <CommentInput 
            annotationId="test-1" 
            onSubmit={() => {}} 
            currentUser="testuser"
          />
        </Wrapper>
      );
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should show user initial in avatar', () => {
      render(
        <Wrapper>
          <CommentInput 
            annotationId="test-1" 
            onSubmit={() => {}} 
            currentUser="testuser"
          />
        </Wrapper>
      );
      
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });

  describe('submit button', () => {
    it('should show disabled submit button when empty', () => {
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={() => {}} />
        </Wrapper>
      );
      
      const button = screen.getByRole('button', { name: /comment/i });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when has content', async () => {
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={() => {}} />
        </Wrapper>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test comment');
      
      const button = screen.getByRole('button', { name: /comment/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('submission', () => {
    it('should call onSubmit when submit button clicked', async () => {
      const handleSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={handleSubmit} />
        </Wrapper>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test comment');
      
      const button = screen.getByRole('button', { name: /comment/i });
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalledWith('test-1', 'Test comment');
    });

    it('should clear input after submission', async () => {
      const handleSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={handleSubmit} />
        </Wrapper>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test comment');
      
      const button = screen.getByRole('button', { name: /comment/i });
      await user.click(button);
      
      expect(textarea).toHaveValue('');
    });

    it('should submit on Cmd+Enter', async () => {
      const handleSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={handleSubmit} />
        </Wrapper>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test comment');
      
      // Simulate Cmd+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      
      expect(handleSubmit).toHaveBeenCalledWith('test-1', 'Test comment');
    });

    it('should submit on Ctrl+Enter', async () => {
      const handleSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={handleSubmit} />
        </Wrapper>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test comment');
      
      // Simulate Ctrl+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      expect(handleSubmit).toHaveBeenCalledWith('test-1', 'Test comment');
    });

    it('should not submit empty content', async () => {
      const handleSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={handleSubmit} />
        </Wrapper>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   '); // Only whitespace
      
      const button = screen.getByRole('button', { name: /comment/i });
      await user.click(button);
      
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts hint', () => {
    it('should show keyboard shortcut hint', () => {
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={() => {}} />
        </Wrapper>
      );
      
      expect(screen.getByText('⌘')).toBeInTheDocument();
      expect(screen.getByText('↵')).toBeInTheDocument();
    });
  });

  describe('autoFocus', () => {
    it('should autofocus when autoFocus is true', () => {
      render(
        <Wrapper>
          <CommentInput annotationId="test-1" onSubmit={() => {}} autoFocus />
        </Wrapper>
      );
      
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });
});
