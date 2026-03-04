/**
 * @comment-md/react-ui - CommentContext Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CommentProvider, useComments } from '../../src/context/CommentContext';
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

describe('CommentProvider', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <CommentProvider>
          <div data-testid="child">Child content</div>
        </CommentProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render with annotations', () => {
      render(
        <CommentProvider annotations={[mockAnnotation]}>
          <div data-testid="child">Child content</div>
        </CommentProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });
});

describe('useComments hook', () => {
  describe('initial state', () => {
    it('should return empty annotations by default', () => {
      const TestWrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper: TestWrapper });
      
      expect(result.current.annotations).toHaveLength(0);
      expect(result.current.activeAnnotationId).toBeNull();
    });

    it('should return provided annotations', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      expect(result.current.annotations).toHaveLength(1);
      expect(result.current.annotations[0].id).toBe('test-1');
    });
  });

  describe('setActiveAnnotation', () => {
    it('should set active annotation', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.setActiveAnnotation('test-1');
      });
      
      expect(result.current.activeAnnotationId).toBe('test-1');
    });

    it('should clear active annotation', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.setActiveAnnotation('test-1');
      });
      
      act(() => {
        result.current.setActiveAnnotation(null);
      });
      
      expect(result.current.activeAnnotationId).toBeNull();
    });
  });

  describe('addComment', () => {
    it('should add comment to annotation', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.addComment('test-1', {
          by: 'new-user',
          content: 'New comment',
        });
      });
      
      const annotation = result.current.getAnnotation('test-1');
      expect(annotation?.comments).toHaveLength(2);
      expect(annotation?.comments[1].by).toBe('new-user');
      expect(annotation?.comments[1].content).toBe('New comment');
    });

    it('should not add comment to non-existent annotation', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      const initialLength = result.current.annotations[0].comments.length;
      
      act(() => {
        result.current.addComment('non-existent', {
          by: 'user',
          content: 'Comment',
        });
      });
      
      expect(result.current.annotations[0].comments.length).toBe(initialLength);
    });
  });

  describe('resolveThread', () => {
    it('should resolve open thread', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.resolveThread('test-1');
      });
      
      const annotation = result.current.getAnnotation('test-1');
      expect(annotation?.status).toBe('resolved');
    });
  });

  describe('reopenThread', () => {
    it('should reopen resolved thread', () => {
      const resolvedAnnotation = { ...mockAnnotation, status: 'resolved' as const };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[resolvedAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.reopenThread('test-1');
      });
      
      const annotation = result.current.getAnnotation('test-1');
      expect(annotation?.status).toBe('open');
    });
  });

  describe('deleteThread', () => {
    it('should delete annotation', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.deleteThread('test-1');
      });
      
      expect(result.current.annotations).toHaveLength(0);
    });

    it('should clear active annotation when deleting active', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.setActiveAnnotation('test-1');
      });
      
      act(() => {
        result.current.deleteThread('test-1');
      });
      
      expect(result.current.activeAnnotationId).toBeNull();
    });
  });

  describe('getAnnotation', () => {
    it('should return annotation by id', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      const annotation = result.current.getAnnotation('test-1');
      expect(annotation).toBeDefined();
      expect(annotation?.id).toBe('test-1');
    });

    it('should return undefined for non-existent id', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider annotations={[mockAnnotation]}>{children}</CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      const annotation = result.current.getAnnotation('non-existent');
      expect(annotation).toBeUndefined();
    });
  });

  describe('onAnnotationsChange callback', () => {
    it('should call callback when annotations change', () => {
      const onChange = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CommentProvider 
          annotations={[mockAnnotation]} 
          onAnnotationsChange={onChange}
        >
          {children}
        </CommentProvider>
      );
      
      const { result } = renderHook(() => useComments(), { wrapper });
      
      act(() => {
        result.current.addComment('test-1', {
          by: 'user',
          content: 'New comment',
        });
      });
      
      expect(onChange).toHaveBeenCalled();
    });
  });
});
