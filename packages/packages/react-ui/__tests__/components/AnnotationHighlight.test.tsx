/**
 * @comment-md/react-ui - AnnotationHighlight Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AnnotationHighlight } from '../../src/components/AnnotationHighlight';
import { CommentProvider } from '../../src/context/CommentContext';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
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

const Wrapper = ({ children, annotations = [mockAnnotation] }: { 
  children: React.ReactNode;
  annotations?: Annotation[];
}) => (
  <ThemeProvider>
    <CommentProvider annotations={annotations}>
      {children}
    </CommentProvider>
  </ThemeProvider>
);

describe('AnnotationHighlight', () => {
  describe('rendering', () => {
    it('should render children content', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            <span>Highlighted content</span>
          </AnnotationHighlight>
        </Wrapper>
      );
      
      expect(screen.getByText('Highlighted content')).toBeInTheDocument();
    });

    it('should apply open status class', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      expect(element).toHaveClass('open');
    });

    it('should apply resolved status class', () => {
      const resolvedAnnotation = { ...mockAnnotation, status: 'resolved' as const };
      render(
        <Wrapper annotations={[resolvedAnnotation]}>
          <AnnotationHighlight id="test-1" status="resolved">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      expect(element).toHaveClass('resolved');
    });
  });

  describe('interaction', () => {
    it('should toggle active state on click', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      
      // Initially not active
      expect(element).not.toHaveClass('active');
      
      // Click to activate
      fireEvent.click(element);
      expect(element).toHaveClass('active');
      
      // Click again to deactivate
      fireEvent.click(element);
      expect(element).not.toHaveClass('active');
    });

    it('should call onClick handler', () => {
      const handleClick = vi.fn();
      
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open" onClick={handleClick}>
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard navigation', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      
      // Should be focusable
      expect(element).toHaveAttribute('tabIndex', '0');
      
      // Enter key should activate
      fireEvent.keyDown(element, { key: 'Enter' });
      expect(element).toHaveClass('active');
      
      // Space key should toggle
      fireEvent.keyDown(element, { key: ' ' });
      expect(element).not.toHaveClass('active');
    });
  });

  describe('badge', () => {
    it('should show comment count badge', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      // Should show badge with count 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show correct count for multiple comments', () => {
      const multiCommentAnnotation: Annotation = {
        ...mockAnnotation,
        comments: [
          { by: 'user1', time: '2026-03-01T10:00:00Z', content: 'Comment 1' },
          { by: 'user2', time: '2026-03-01T10:05:00Z', content: 'Comment 2' },
          { by: 'user3', time: '2026-03-01T10:10:00Z', content: 'Comment 3' },
        ],
      };
      
      render(
        <Wrapper annotations={[multiCommentAnnotation]}>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not show badge when no comments', () => {
      const noCommentAnnotation: Annotation = {
        ...mockAnnotation,
        comments: [],
      };
      
      render(
        <Wrapper annotations={[noCommentAnnotation]}>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      // Should not find any number badge
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('data attributes', () => {
    it('should set data-annotation-id', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      expect(element).toHaveAttribute('data-annotation-id', 'test-1');
    });

    it('should set data-annotation-status', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      expect(element).toHaveAttribute('data-annotation-status', 'open');
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(
        <Wrapper>
          <AnnotationHighlight id="test-1" status="open" className="custom-class">
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      expect(element).toHaveClass('custom-class');
    });

    it('should apply custom style', () => {
      render(
        <Wrapper>
          <AnnotationHighlight 
            id="test-1" 
            status="open" 
            style={{ marginTop: '10px' }}
          >
            Content
          </AnnotationHighlight>
        </Wrapper>
      );
      
      const element = screen.getByRole('button');
      expect(element).toHaveStyle({ marginTop: '10px' });
    });
  });
});
