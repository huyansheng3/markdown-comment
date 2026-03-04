/**
 * @comment-md/react-ui - Integration Tests
 * 
 * Tests the full workflow of the comment system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import {
  CommentProvider,
  useComments,
  CommentSidebar,
  AnnotationHighlight,
  CommentInput,
  ThemeProvider,
  I18nProvider,
} from '../../src/index';
import type { Annotation } from '@comment-md/core';

const initialAnnotations: Annotation[] = [
  {
    id: 'ann-1',
    status: 'open',
    content: 'First annotated content',
    contentHash: 'hash1',
    position: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 22, offset: 21 },
    },
    comments: [
      { by: 'reviewer', time: '2026-03-01T10:00:00Z', content: 'Please review this' },
    ],
  },
  {
    id: 'ann-2',
    status: 'resolved',
    content: 'Second annotated content',
    contentHash: 'hash2',
    position: {
      start: { line: 3, column: 1, offset: 30 },
      end: { line: 3, column: 24, offset: 53 },
    },
    comments: [
      { by: 'author', time: '2026-03-01T09:00:00Z', content: 'Done' },
    ],
  },
];

/**
 * Test application component
 */
function TestApp({ 
  onAnnotationsChange,
}: { 
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  
  const handleAnnotationsChange = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
    onAnnotationsChange?.(newAnnotations);
  };
  
  return (
    <I18nProvider locale="en">
      <ThemeProvider>
        <CommentProvider
          annotations={annotations}
          onAnnotationsChange={handleAnnotationsChange}
          activeAnnotationId={activeAnnotationId}
        >
          <TestContent 
            onSetActive={(id) => setActiveAnnotationId(id)}
          />
          <CommentSidebar currentUser="testuser" showAnnotationsList />
        </CommentProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

function TestContent({ onSetActive }: { onSetActive: (id: string | null) => void }) {
  const { annotations } = useComments();
  
  return (
    <div data-testid="content">
      <h1>Test Document</h1>
      <p>Some regular content</p>
      
      {annotations.map((ann) => (
        <AnnotationHighlight
          key={ann.id}
          id={ann.id}
          status={ann.status}
          onClick={() => onSetActive(ann.id)}
        >
          {ann.content}
        </AnnotationHighlight>
      ))}
    </div>
  );
}

describe('Integration Tests', () => {
  describe('full workflow', () => {
    it('should render content with annotations', () => {
      render(<TestApp />);
      
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(screen.getAllByText('First annotated content').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Second annotated content').length).toBeGreaterThan(0);
    });

    it('should show annotations list in sidebar', () => {
      render(<TestApp />);
      
      // Sidebar should show annotation previews - may appear multiple times
      expect(screen.getAllByText('First annotated content').length).toBeGreaterThan(0);
    });

    it('should activate annotation on click', async () => {
      render(<TestApp />);
      
      // Click on the first annotation (use getAllByText since it appears multiple times)
      const annotations = screen.getAllByText('First annotated content');
      fireEvent.click(annotations[0]);
      
      // Should show the comment in sidebar
      await waitFor(() => {
        expect(screen.getByText('Please review this')).toBeInTheDocument();
      });
    });

    it('should show reviewer name', async () => {
      render(<TestApp />);
      
      // Click on the first annotation
      const annotations = screen.getAllByText('First annotated content');
      fireEvent.click(annotations[0]);
      
      await waitFor(() => {
        expect(screen.getByText('reviewer')).toBeInTheDocument();
      });
    });
  });

  describe('adding comments', () => {
    it('should add new comment to annotation', async () => {
      const onAnnotationsChange = vi.fn();
      const user = userEvent.setup();
      
      render(<TestApp onAnnotationsChange={onAnnotationsChange} />);
      
      // Click on the first annotation to activate it (use getAllByText)
      const annotations = screen.getAllByText('First annotated content');
      fireEvent.click(annotations[0]);
      
      // Wait for input to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      });
      
      // Type a comment
      const textarea = screen.getByPlaceholderText('Add a comment...');
      await user.type(textarea, 'New comment from test');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /comment/i });
      await user.click(submitButton);
      
      // Should call onAnnotationsChange
      expect(onAnnotationsChange).toHaveBeenCalled();
      
      // The new comment should be added
      const lastCall = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1];
      const updatedAnnotations = lastCall[0];
      const firstAnnotation = updatedAnnotations.find((a: Annotation) => a.id === 'ann-1');
      expect(firstAnnotation?.comments).toHaveLength(2);
      expect(firstAnnotation?.comments[1].content).toBe('New comment from test');
    });
  });

  describe('resolving threads', () => {
    it('should resolve open thread', async () => {
      const onAnnotationsChange = vi.fn();
      const user = userEvent.setup();
      
      render(<TestApp onAnnotationsChange={onAnnotationsChange} />);
      
      // Click on the first annotation to activate it (use getAllByText)
      const annotations = screen.getAllByText('First annotated content');
      fireEvent.click(annotations[0]);
      
      // Wait for resolve button to appear
      await waitFor(() => {
        expect(screen.getByText('Resolve')).toBeInTheDocument();
      });
      
      // Click resolve
      const resolveButton = screen.getByText('Resolve');
      await user.click(resolveButton);
      
      // Should call onAnnotationsChange with resolved status
      expect(onAnnotationsChange).toHaveBeenCalled();
      const lastCall = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1];
      const updatedAnnotations = lastCall[0];
      const firstAnnotation = updatedAnnotations.find((a: Annotation) => a.id === 'ann-1');
      expect(firstAnnotation?.status).toBe('resolved');
    });

    it('should reopen resolved thread', async () => {
      const onAnnotationsChange = vi.fn();
      const user = userEvent.setup();
      
      render(<TestApp onAnnotationsChange={onAnnotationsChange} />);
      
      // Click on the second (resolved) annotation (use getAllByText)
      const annotations = screen.getAllByText('Second annotated content');
      fireEvent.click(annotations[0]);
      
      // Wait for reopen button to appear
      await waitFor(() => {
        expect(screen.getByText('Reopen')).toBeInTheDocument();
      });
      
      // Click reopen
      const reopenButton = screen.getByText('Reopen');
      await user.click(reopenButton);
      
      // Should call onAnnotationsChange with open status
      expect(onAnnotationsChange).toHaveBeenCalled();
      const lastCall = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1];
      const updatedAnnotations = lastCall[0];
      const secondAnnotation = updatedAnnotations.find((a: Annotation) => a.id === 'ann-2');
      expect(secondAnnotation?.status).toBe('open');
    });
  });

  describe('deleting threads', () => {
    it('should delete thread when confirmed', async () => {
      const onAnnotationsChange = vi.fn();
      const user = userEvent.setup();
      
      // Mock confirm dialog
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<TestApp onAnnotationsChange={onAnnotationsChange} />);
      
      // Click on the first annotation to activate it (use getAllByText)
      const annotations = screen.getAllByText('First annotated content');
      fireEvent.click(annotations[0]);
      
      // Wait for delete button to appear
      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
      
      // Click delete
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      // Should call onAnnotationsChange
      expect(onAnnotationsChange).toHaveBeenCalled();
      const lastCall = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1];
      const updatedAnnotations = lastCall[0];
      expect(updatedAnnotations).toHaveLength(1);
      expect(updatedAnnotations.find((a: Annotation) => a.id === 'ann-1')).toBeUndefined();
      
      vi.restoreAllMocks();
    });
  });

  describe('theme integration', () => {
    it('should apply custom theme', () => {
      const customTheme = {
        colors: {
          accentOpen: '#ff0000',
        },
      };
      
      render(
        <I18nProvider>
          <ThemeProvider theme={customTheme as any}>
            <CommentProvider annotations={initialAnnotations}>
              <div data-testid="themed-content">
                <AnnotationHighlight id="ann-1" status="open">
                  Content
                </AnnotationHighlight>
              </div>
            </CommentProvider>
          </ThemeProvider>
        </I18nProvider>
      );
      
      expect(screen.getByTestId('themed-content')).toBeInTheDocument();
    });
  });

  describe('i18n integration', () => {
    it('should display Chinese UI', () => {
      render(
        <I18nProvider locale="zh-CN">
          <ThemeProvider>
            <CommentProvider annotations={[]}>
              <CommentSidebar />
            </CommentProvider>
          </ThemeProvider>
        </I18nProvider>
      );
      
      expect(screen.getByText('评论')).toBeInTheDocument();
    });

    it('should display Japanese UI', () => {
      render(
        <I18nProvider locale="ja">
          <ThemeProvider>
            <CommentProvider annotations={[]}>
              <CommentSidebar />
            </CommentProvider>
          </ThemeProvider>
        </I18nProvider>
      );
      
      expect(screen.getByText('コメント')).toBeInTheDocument();
    });
  });
});

describe('Context + Providers combination', () => {
  it('should work with nested providers', () => {
    render(
      <I18nProvider locale="en">
        <ThemeProvider>
          <CommentProvider annotations={initialAnnotations}>
            <I18nProvider locale="zh-CN">
              <ThemeProvider>
                <CommentSidebar title="Nested Test" />
              </ThemeProvider>
            </I18nProvider>
          </CommentProvider>
        </ThemeProvider>
      </I18nProvider>
    );
    
    // Should use innermost provider's locale (zh-CN)
    // But custom title overrides
    expect(screen.getByText('Nested Test')).toBeInTheDocument();
  });
});
